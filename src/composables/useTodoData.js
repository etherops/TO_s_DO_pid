// composables/useTodoData.js
import { ref } from 'vue';
import axios from 'axios';
import { parseTodoMdFile, renderTodoMdFile } from '../utils/TodoMdParser';

const API_BASE_URL = 'http://localhost:3001/api';

export function useTodoData() {
    const todoData = ref({ columnOrder: [], columnStacks: {} });
    const loading = ref(true);
    const availableFiles = ref([]);
    const selectedFile = ref({ name: '', path: '', isBuiltIn: true });
    const parsingError = ref('');
    const showRawText = ref(false);
    const focusMode = ref(localStorage.getItem('focusMode') === 'true');

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

        // Update selected file
        selectedFile.value = file;

        // Save selected file path to localStorage
        localStorage.setItem('selectedTodoFilePath', selectedFile.value.path);

        await loadTodoData();
    };

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