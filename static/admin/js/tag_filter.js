// static/admin/js/tag_filter.js

window.addEventListener('DOMContentLoaded', function() {
    (function($) {
        // Find our tag selector and initialize the Select2 library on it.
        $('#tag-selector').select2({
            placeholder: 'Select tags to filter by...',
            allowClear: true
        });
    })(django.jQuery);
});