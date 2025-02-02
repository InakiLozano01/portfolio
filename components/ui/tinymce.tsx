'use client';

import { Editor } from '@tinymce/tinymce-react';
import { useRef } from 'react';
import type { Editor as TinyMCEEditor, EditorEvent } from 'tinymce';

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
] satisfies string[];

interface TinyMCEProps {
    value: string;
    onChange: (value: string) => void;
    height?: number;
    disabled?: boolean;
    id?: string;
}

export function TinyMCE({ value, onChange, height = 500, disabled = false, id }: TinyMCEProps) {
    const editorRef = useRef<TinyMCEEditor | null>(null);

    return (
        <Editor
            id={id}
            tinymceScriptSrc="https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.7.3/tinymce.min.js"
            disabled={disabled}
            onInit={(evt: EditorEvent<any>, editor: TinyMCEEditor) => {
                editorRef.current = editor;
            }}
            value={value}
            onEditorChange={onChange}
            init={{
                height,
                // Core settings
                promotion: false,
                branding: false,
                convert_urls: false, // Don't convert data URLs

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

                // Image settings
                automatic_uploads: false, // Disable automatic uploads
                paste_data_images: true,
                images_file_types: 'jpg,jpeg,png,gif,webp',

                // Custom image upload handler for the image dialog
                images_upload_handler: async function (blobInfo: any, progress: any) {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const base64 = reader.result as string;
                            resolve(base64);
                        };
                        reader.onerror = () => reject(reader.error);
                        reader.readAsDataURL(blobInfo.blob());
                    });
                },

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

                // Quick toolbar settings
                quickbars_selection_toolbar: 'bold italic | quicklink h2 h3 blockquote',
                quickbars_insert_toolbar: 'quickimage quicktable',

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
                    img {
                        max-width: 100%;
                        height: auto;
                        display: block;
                        margin: 1rem auto;
                    }
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
            }}
        />
    );
}