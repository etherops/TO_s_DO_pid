// composables/useTodoData.js
import { ref } from 'vue';
import axios from 'axios';
import { parseTodoMdFile, renderTodoMdFile } from '../utils/TodoMdParser';

const API_BASE_URL = 'http://localhost:3001/api';

export function useTodoData() {
    const sections = ref([]);
    const loading = ref(true);
    const availableFiles = ref([]);
    const selectedFile = ref({ name: '', isCustom: false });
    const parsingError = ref('');

    // Load available text files from the server
    const loadAvailableFiles = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/files`);
            availableFiles.value = response.data.files;

            // Check for saved file in localStorage
            const savedFile = JSON.parse(localStorage.getItem('selectedTodoFile'));
            selectedFile.value = savedFile ? savedFile : availableFiles.value[0];
        } catch (error) {
            console.error('Error loading file list:', error);
        }
    };

    // Load todo data from the server for the selected file
    const loadTodoData = async () => {
        try {
            loading.value = true;
            parsingError.value = '';

            // Load from server
            const params = selectedFile.value.name ? {
                filename: selectedFile.value.name,
                isCustom: selectedFile.value.isCustom
            } : {};

            const response = await axios.get(`${API_BASE_URL}/todos`, { params });

            try {
                // Parse the todo markdown file
                sections.value = parseTodoMdFile(response.data.content);
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
                sections.value = [];
                
                // Clear the saved file from localStorage if it no longer exists
                localStorage.removeItem('selectedTodoFile');
                
                // Try to load the first available file instead
                if (availableFiles.value.length > 0) {
                    selectedFile.value = availableFiles.value[0];
                    localStorage.setItem('selectedTodoFile', JSON.stringify(selectedFile.value));
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
            // Render the sections into markdown format
            const content = renderTodoMdFile(sections.value);

            if (!content) {
                console.error('No content generated for saving');
                return false;
            }

            // Send the content to the server
            const payload = {
                content,
                filename: selectedFile.value.name,
                isCustom: selectedFile.value.isCustom
            };

            await axios.post(`${API_BASE_URL}/todos`, payload);
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

        // Save selected file to localStorage
        localStorage.setItem('selectedTodoFile', JSON.stringify(selectedFile.value));

        await loadTodoData();
    };

    return {
        sections,
        loading,
        availableFiles,
        selectedFile,
        parsingError,
        loadAvailableFiles,
        loadTodoData,
        persistTodoData,
        handleFileChange
    };
}