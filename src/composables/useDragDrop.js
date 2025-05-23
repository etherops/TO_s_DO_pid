// composables/useDragDrop.js
import { ref } from 'vue';

export function useDragDrop(sections, emit) {
    // Track dragging state
    const isDragging = ref(false);
    const draggedSection = ref(null);

    // Helper to find the ARCHIVE section index
    const getArchiveSectionIndex = () => {
        return sections.findIndex(section => section.name === 'ARCHIVE');
    };

    // Start dragging a section
    const onSectionDragStart = (event) => {
        isDragging.value = true;
        draggedSection.value = event.item.__draggable_context.element;

        // If the dragged section is archivable, add a special class to the done column
        if (draggedSection.value.archivable) {
            document.querySelector('.done-column')?.classList.add('potential-target');
        }
    };

    // End dragging a section
    const onSectionDragEnd = (event) => {
        isDragging.value = false;
        draggedSection.value = null;

        // Remove classes from the done column
        document.querySelector('.done-column')?.classList.remove('potential-target', 'drag-target');
    };

    // Handle section added to DONE column
    const onSectionAdded = (event) => {
        // Get the moved section from the event
        const movedSection = event.item.__draggable_context.element;

        // Find the ARCHIVE section
        const archiveSectionIndex = getArchiveSectionIndex();
        if (archiveSectionIndex === -1) {
            console.error('ARCHIVE section not found');
            return false;
        }

        // Find the current position of the moved section in the main sections array
        const currentIndex = sections.findIndex(s => s.name === movedSection.name);
        if (currentIndex === -1) {
            console.error('Moved section not found in sections array');
            return false;
        }

        // Remove the section from its current position
        const [removed] = sections.splice(currentIndex, 1);

        // Insert it right after the ARCHIVE section
        sections.splice(archiveSectionIndex, 0, removed);

        // Update its column property
        removed.column = 'DONE';

        // Emit update event
        emit('update');
    };

    return {
        isDragging,
        draggedSection,
        onSectionDragStart,
        onSectionDragEnd,
        onSectionAdded
    };
}