// static/admin/js/category_filter.js
// FINAL, DEFINITIVE VERSION - Simplified for the new server-side logic.

window.addEventListener('DOMContentLoaded', function() {
    (function($) {
        // This script is now only for the "Add" page.
        // On "edit" pages, Django handles showing the correct section.
        // We can detect if this is an "Add" page because the form URL will end with /add/
        if (!window.location.pathname.endsWith('/add/')) {
            return; // Do nothing on "edit" pages
        }

        const categorySelect = $('#id_category');

        // On the "Add" page, no category-specific fields should be visible until chosen.
        const warningDiv = $('<div id="category-warning" style="padding: 10px; background-color: #ffc; border: 1px solid #e6db55; margin-bottom: 20px;">Please select a category to see the relevant fields.</div>');

        // Find the "Core Information" fieldset and add our warning message after it.
        $('.form-row.field-category').parent().after(warningDiv);

        // When the category changes, we don't need fancy JS. We just need to reload the page
        // with the category pre-selected, but that's complex. A simpler approach for now
        // is to tell the user what to do.
        categorySelect.on('change', function() {
            if ($(this).val()) {
                warningDiv.html('<strong style="color: green;">You have selected a category. Please click "Save and continue editing" to fill in the category-specific details.</strong>');
            } else {
                warningDiv.text('Please select a category to see the relevant fields.');
            }
        });

    })(django.jQuery);
});