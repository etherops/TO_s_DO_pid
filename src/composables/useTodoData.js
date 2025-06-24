// composables/useTodoData.js
import { ref, onUnmounted } from 'vue';
import axios from 'axios';
import { parseTodoMdFile, renderTodoMdFile } from '../utils/TodoMdParser';
import SparkMD5 from 'spark-md5';

const API_BASE_URL = 'http://localhost:3001/api';
const WS_URL = 'ws://localhost:3001';

export function useTodoData() {
    const todoData = ref({ columnOrder: [], columnStacks: {} });
    const loading = ref(true);
    const availableFiles = ref([]);
    const selectedFile = ref({ name: '', path: '', isBuiltIn: true });
    const parsingError = ref('');
    const showRawText = ref(false);
    const focusMode = ref(localStorage.getItem('focusMode') === 'true');
    
    let ws = null;
    let reconnectTimeout = null;

    // Load available text files from the server
    const loadAvailableFiles = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/files`);
            availableFiles.value = response.data.files;

            // Check for saved file in localStorage
            const savedFilePath = localStorage.getItem('selectedTodoFilePath');
            if (savedFilePath) {
                // Find the file by path
                const foundFile = availableFiles.value.find(f => f.path === savedFilePath);
                selectedFile.value = foundFile || availableFiles.value[0] || { name: '', path: '', isBuiltIn: true };
            } else {
                selectedFile.value = availableFiles.value[0] || { name: '', path: '', isBuiltIn: true };
            }
        } catch (error) {
            console.error('Error loading file list:', error);
        }
    };

    // Load todo data from the server for the selected file
    const loadTodoData = async () => {
        try {
            loading.value = true;
            parsingError.value = '';

            // Load from server using path
            if (!selectedFile.value.path) {
                parsingError.value = 'No file selected';
                loading.value = false;
                return;
            }

            const response = await axios.get(`${API_BASE_URL}/todos`, { 
                params: { path: selectedFile.value.path } 
            });

            try {
                todoData.value = parseTodoMdFile(response.data.content);
            } catch (parseError) {
                console.error('Error parsing server todo file:', parseError);
                parsingError.value = `Error parsing file: ${parseError.message || 'Invalid format'}`;
            }

            loading.value = false;
        } catch (error) {
            console.error('Error loading todo file:', error);
            
            // Handle 404 errors specifically
            if (error.response && error.response.status === 404) {
                parsingError.value = 'File no longer exists. Please select a different file.';
                todoData.value = { columnOrder: [], columnStacks: {} };
                
                // Clear the saved file from localStorage if it no longer exists
                localStorage.removeItem('selectedTodoFilePath');
                
                // Try to load the first available file instead
                if (availableFiles.value.length > 0) {
                    selectedFile.value = availableFiles.value[0];
                    localStorage.setItem('selectedTodoFilePath', selectedFile.value.path);
                    // Reload with the new file
                    await loadTodoData();
                    return;
                }
            } else {
                parsingError.value = `Error loading file: ${error.message || 'Could not load file'}`;
            }
            
            loading.value = false;
        }
    };

    // Save todo data to the server
    const persistTodoData = async () => {
        try {
            // Render using nested structure
            const content = renderTodoMdFile(todoData.value);

            if (!content) {
                console.error('No content generated for saving');
                return false;
            }

            // Send the content to the server
            if (!selectedFile.value.path) {
                console.error('No file path available for saving');
                return false;
            }

            await axios.post(`${API_BASE_URL}/todos`, {
                content,
                path: selectedFile.value.path
            });
            
            return true;
        } catch (error) {
            console.error('Error saving todo data:', error);
            parsingError.value = `Error saving file: ${error.message || 'Could not save file'}`;
            return false;
        }
    };

    // Handle file selection change
    const handleFileChange = async (file) => {
        // Clear any previous parsing errors
        parsingError.value = '';

        // Note: We don't explicitly unwatch files - they're cleaned up when no clients watch them

        // Update selected file
        selectedFile.value = file;

        // Save selected file path to localStorage
        localStorage.setItem('selectedTodoFilePath', selectedFile.value.path);

        await loadTodoData();
        
        // Start watching new file
        if (ws && ws.readyState === WebSocket.OPEN && selectedFile.value.path) {
            ws.send(JSON.stringify({
                type: 'watch',
                filePath: selectedFile.value.path
            }));
        }
    };
    
    // Initialize WebSocket connection
    const initWebSocket = () => {
        try {
            ws = new WebSocket(WS_URL);
            
            ws.onopen = () => {
                console.log('WebSocket connected');
                
                // Start watching current file if any
                if (selectedFile.value.path) {
                    ws.send(JSON.stringify({
                        type: 'watch',
                        filePath: selectedFile.value.path
                    }));
                }
            };
            
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'fileChanged' && data.filePath === selectedFile.value.path) {
                        // Always compute and compare checksums
                        const currentContent = renderTodoMdFile(todoData.value);
                        const currentChecksum = SparkMD5.hash(currentContent);
                        
                        console.log('Checksum comparison:', {
                            fileChecksum: data.checksum,
                            currentChecksum: currentChecksum,
                            match: data.checksum === currentChecksum
                        });
                        
                        if (data.checksum === currentChecksum) {
                            console.log('Checksums match, skipping reload (our own change)');
                            return;
                        }
                        
                        console.log('File changed externally, reloading:', data.filePath);
                        // Reload the file
                        loadTodoData();
                    }
                } catch (error) {
                    console.error('Error processing WebSocket message:', error);
                }
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
            
            ws.onclose = () => {
                console.log('WebSocket disconnected');
                
                // Attempt to reconnect after 3 seconds
                reconnectTimeout = setTimeout(() => {
                    console.log('Attempting to reconnect WebSocket...');
                    initWebSocket();
                }, 3000);
            };
        } catch (error) {
            console.error('Error initializing WebSocket:', error);
        }
    };
    
    // Start WebSocket connection
    initWebSocket();
    
    // Cleanup on unmount
    onUnmounted(() => {
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
        }
        
        if (ws) {
            ws.close();
        }
    });

    return {
        todoData,
        loading,
        availableFiles,
        selectedFile,
        parsingError,
        showRawText,
        focusMode,
        loadAvailableFiles,
        loadTodoData,
        persistTodoData,
        handleFileChange
    };
}