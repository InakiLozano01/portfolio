'use client';

import { Editor } from '@tinymce/tinymce-react';
import { useRef, useEffect } from 'react';
import type { Editor as TinyMCEEditor } from 'tinymce';

// List of all free plugins from TinyMCE Community
const FREE_PLUGINS = [
    'advlist',
    'autolink',
    'lists',
    'link',
    'image',
    'charmap',
    'preview',
    'anchor',
    'searchreplace',
    'visualblocks',
    'code',
    'fullscreen',
    'insertdatetime',
    'media',
    'table',
    'help',
    'wordcount',
    'emoticons',
    'importcss',
    'directionality',
    'nonbreaking',
    'quickbars',
    'visualchars',
];

interface TinyMCEProps {
    value: string;
    onChange: (value: string) => void;
    height?: number;
    disabled?: boolean;
    id?: string;
}

export function TinyMCE({ value, onChange, height = 500, disabled = false, id }: TinyMCEProps) {
    const editorRef = useRef<TinyMCEEditor | null>(null);

    // Load TinyMCE plugins on the client side
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Core TinyMCE
            require('tinymce/tinymce');
            // Theme
            require('tinymce/themes/silver');
            // Icons
            require('tinymce/icons/default');

            // Load all free plugins
            FREE_PLUGINS.forEach(plugin => {
                require(`tinymce/plugins/${plugin}`);
            });
        }
    }, []);

    return (
        <Editor
            id={id}
            tinymceScriptSrc="/tinymce/tinymce.min.js"
            disabled={disabled}
            onInit={(evt, editor) => {
                editorRef.current = editor;
            }}
            value={value}
            onEditorChange={onChange}
            init={{
                height,
                // Core settings
                base_url: '/tinymce',
                suffix: '.min',
                promotion: false,
                branding: false,

                // Menu configuration
                menubar: 'file edit view insert format tools table help',
                menu: {
                    file: {
                        title: 'File',
                        items: 'newdocument restoredraft | preview | export print | deleteallconversations'
                    },
                    edit: {
                        title: 'Edit',
                        items: 'undo redo | cut copy paste pastetext | selectall | searchreplace'
                    },
                    view: {
                        title: 'View',
                        items: 'code | visualaid visualchars visualblocks | spellchecker | preview fullscreen | showcomments'
                    },
                    insert: {
                        title: 'Insert',
                        items: 'image link media addcomment pageembed template codesample inserttable | charmap emoticons hr | pagebreak nonbreaking anchor tableofcontents | insertdatetime'
                    },
                    format: {
                        title: 'Format',
                        items: 'bold italic underline strikethrough superscript subscript codeformat | styles blocks fontfamily fontsize align lineheight | forecolor backcolor | language | removeformat'
                    },
                    tools: {
                        title: 'Tools',
                        items: 'spellchecker spellcheckerlanguage | a11ycheck code wordcount'
                    },
                    table: {
                        title: 'Table',
                        items: 'inserttable | cell row column | advtablesort | tableprops deletetable'
                    },
                },

                // Toolbar configuration
                toolbar1: 'undo redo | blocks | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media | forecolor backcolor | code fullscreen',

                // Plugin configuration
                plugins: FREE_PLUGINS,

                // Z-index settings for nested modals
                z_index: 100000,

                // Content styling
                content_css: 'default',
                content_style: `
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                        font-size: 16px;
                        line-height: 1.6;
                        color: #1a1a1a;
                        margin: 1rem;
                        -webkit-font-smoothing: antialiased;
                        -moz-osx-font-smoothing: grayscale;
                    }
                    table {
                        border-collapse: collapse;
                        width: 100%;
                        margin: 1rem 0;
                    }
                    table td, table th {
                        border: 1px solid #ddd;
                        padding: 0.5rem;
                    }
                    table th {
                        background-color: #f5f5f5;
                    }
                    p { margin: 0 0 1rem 0; }
                    .tox-tinymce {
                        border: 1px solid #e2e8f0 !important;
                        border-radius: 0.375rem !important;
                        backdrop-filter: none !important;
                    }
                    .tox-editor-container {
                        backdrop-filter: none !important;
                    }
                    .tox-edit-area {
                        backdrop-filter: none !important;
                    }
                    .tox-edit-area__iframe {
                        backdrop-filter: none !important;
                    }
                    .tox-dialog {
                        backdrop-filter: none !important;
                    }
                    .tox-dialog-wrap {
                        backdrop-filter: none !important;
                    }
                    .tox-tbtn--select, .tox-tbtn--bespoke {
                        transform: none !important;
                    }
                `,

                // File picker and image upload settings
                file_picker_types: 'image',
                images_upload_url: '/api/upload',
                automatic_uploads: true,
                images_reuse_filename: true,
                images_upload_credentials: true,
                paste_data_images: true,
                image_advtab: true,
                image_dimensions: true,
                image_description: false,
                image_uploadtab: true,
                image_title: false,
                images_file_types: 'jpg,jpeg,png,gif,webp,svg',
                image_class_list: [
                    { title: 'None', value: '' },
                    { title: 'Responsive', value: 'img-fluid' }
                ],

                // Table settings
                table_appearance_options: true,
                table_grid: true,
                table_resize_bars: true,
                table_header_type: 'sectionCells',
                table_default_attributes: {
                    border: '1'
                },
                table_default_styles: {
                    'border-collapse': 'collapse',
                    'width': '100%'
                },
                table_class_list: [
                    { title: 'None', value: '' },
                    { title: 'Basic', value: 'table' },
                    { title: 'Bordered', value: 'table table-bordered' }
                ],

                // Quick toolbar settings
                quickbars_selection_toolbar: 'bold italic | quicklink h2 h3 blockquote',
                quickbars_insert_toolbar: 'quickimage quicktable',

                // Style formats
                style_formats: [
                    {
                        title: 'Headings', items: [
                            { title: 'Heading 1', format: 'h1' },
                            { title: 'Heading 2', format: 'h2' },
                            { title: 'Heading 3', format: 'h3' },
                            { title: 'Heading 4', format: 'h4' },
                            { title: 'Heading 5', format: 'h5' },
                            { title: 'Heading 6', format: 'h6' }
                        ]
                    },
                    {
                        title: 'Inline', items: [
                            { title: 'Bold', format: 'bold' },
                            { title: 'Italic', format: 'italic' },
                            { title: 'Underline', format: 'underline' },
                            { title: 'Strikethrough', format: 'strikethrough' },
                            { title: 'Code', format: 'code' }
                        ]
                    },
                    {
                        title: 'Blocks', items: [
                            { title: 'Paragraph', format: 'p' },
                            { title: 'Blockquote', format: 'blockquote' },
                            { title: 'Pre', format: 'pre' }
                        ]
                    }
                ],

                // Setup function
                setup: function (editor) {
                    editor.on('init', function () {
                        editor.getContainer().style.transition = "none";
                        if (!editor.getContent()) {
                            editor.setContent('<p></p>');
                        }
                    });

                    // Handle modal focus
                    editor.on('OpenWindow', function (e) {
                        setTimeout(() => {
                            const dialog = document.querySelector('.tox-dialog');
                            if (dialog) {
                                const firstInput = dialog.querySelector('input, select, textarea') as HTMLElement;
                                if (firstInput) {
                                    firstInput.focus();
                                }
                            }
                        }, 100);
                    });
                },

                // Image upload handler with better error handling
                images_upload_handler: async function (blobInfo, progress) {
                    const editor = editorRef.current;
                    try {
                        // If the image is from paste, encode it as base64
                        if (blobInfo.blob().size < 512 * 1024) { // Less than 512KB
                            const reader = new FileReader();
                            return new Promise((resolve, reject) => {
                                reader.onload = () => {
                                    resolve(reader.result as string);
                                };
                                reader.onerror = () => {
                                    reject('Failed to read image');
                                };
                                reader.readAsDataURL(blobInfo.blob());
                            });
                        }

                        // For larger images or uploaded files, use the server
                        const formData = new FormData();
                        formData.append('file', blobInfo.blob(), blobInfo.filename());

                        const response = await fetch('/api/upload', {
                            method: 'POST',
                            body: formData,
                            credentials: 'include'
                        });

                        if (!response.ok) {
                            const error = await response.json();
                            throw new Error(error.error || 'Upload failed');
                        }

                        const result = await response.json();
                        return result.url;
                    } catch (error: any) {
                        console.error('Image upload failed:', error);
                        if (editor) {
                            editor.notificationManager.open({
                                text: error.message || 'Image upload failed',
                                type: 'error',
                                timeout: 3000
                            });
                        }
                        throw error;
                    }
                },

                // Additional paste settings
                paste_as_text: false,
                paste_enable_default_filters: true,
                paste_word_valid_elements: "p,b,strong,i,em,h1,h2,h3,h4,h5,h6,table,tr,td,th,div,ul,ol,li,a[href],span,img[src],code",
            }}
        />
    );
}