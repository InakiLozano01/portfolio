'use client';

import { Editor } from '@tinymce/tinymce-react';
import { forwardRef, useImperativeHandle, useRef } from 'react';
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
    label?: string;
}

export interface TinyMCEHandle {
    uploadImages: () => Promise<string>;
    getContent: () => string;
    hasEmbeddedImages: () => boolean;
}

const hasEmbeddedImages = (html: string) => /data:image\/[a-z0-9.+-]+;base64,/i.test(html);

type TinyMCEUploadResult = {
    status: boolean;
    removed?: boolean;
    uploadUri?: string;
};

const uploadTinyMCEImage = async (blobInfo: any, progress: (value: number) => void): Promise<string> => {
    const formData = new FormData();
    formData.append('file', blobInfo.blob(), blobInfo.filename());
    progress(10);

    const response = await fetch('/api/upload/blog-image', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
    });

    progress(90);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw {
            message: typeof data?.error === 'string' ? data.error : `Image upload failed (${response.status})`,
            remove: false,
        };
    }

    if (typeof data?.location !== 'string') {
        throw {
            message: 'Image upload completed without a file location',
            remove: false,
        };
    }

    progress(100);
    return data.location;
};

export const TinyMCE = forwardRef<TinyMCEHandle, TinyMCEProps>(function TinyMCE(
    { value, onChange, height = 400, disabled = false, id, label = 'Rich text editor' },
    ref
) {
    const editorRef = useRef<TinyMCEEditor | null>(null);

    useImperativeHandle(ref, () => ({
        async uploadImages() {
            const editor = editorRef.current;
            if (!editor) return value;

            const results = await (editor as TinyMCEEditor & { uploadImages: () => Promise<TinyMCEUploadResult[]> }).uploadImages();
            const failedUpload = results.find((result) => result.status !== true);
            if (failedUpload) {
                throw new Error('One or more images could not be uploaded. Check the image and try saving again.');
            }

            const content = editor.getContent();
            onChange(content);

            if (hasEmbeddedImages(content)) {
                throw new Error('One or more pasted images are still uploading. Wait a moment, then save again.');
            }

            return content;
        },
        getContent() {
            return editorRef.current?.getContent() ?? value;
        },
        hasEmbeddedImages() {
            return hasEmbeddedImages(editorRef.current?.getContent() ?? value);
        },
    }), [onChange, value]);

    return (
        <div style={{ height, minHeight: height, maxHeight: height }} className="overflow-hidden">
        <Editor
            id={id}
            tinymceScriptSrc="/tinymce/tinymce.min.js"
            licenseKey="gpl"
            disabled={disabled}
            onInit={(evt: EditorEvent<any>, editor: TinyMCEEditor) => {
                editorRef.current = editor;
                // TinyMCE 8 labels the editable body but leaves its document role.
                const body = editor.getBody();
                body.setAttribute('role', 'textbox');
                body.setAttribute('aria-multiline', 'true');
                const menu = editor.getContainer().querySelector('[role="menubar"]');
                menu?.setAttribute('tabindex', '0');
                menu?.setAttribute('aria-label', `${label} formatting menu`);
            }}
            value={value}
            onEditorChange={onChange}
            init={{
                height,
                iframe_aria_text: label,
                iframe_attrs: { title: label },
                // Core settings
                promotion: false,
                branding: false,
                convert_urls: false, // Don't convert data URLs

                // Menu configuration
                menubar: 'edit insert format table view tools help',
                menu: {
                    edit: {
                        title: 'Edit',
                        items: 'undo redo | cut copy paste pastetext | selectall | searchreplace'
                    },
                    view: {
                        title: 'View',
                        items: 'code | visualaid visualchars visualblocks | preview'
                    },
                    insert: {
                        title: 'Insert',
                        items: 'image link media inserttable | charmap emoticons hr | nonbreaking anchor insertdatetime'
                    },
                    format: {
                        title: 'Format',
                        items: 'bold italic underline strikethrough superscript subscript codeformat | blocks align lineheight | forecolor backcolor | removeformat'
                    },
                    tools: {
                        title: 'Tools',
                        items: 'code wordcount'
                    },
                    table: {
                        title: 'Table',
                        items: 'inserttable | cell row column | tableprops deletetable'
                    },
                },

                // Toolbar configuration
                toolbar1: 'undo redo | blocks | bold italic underline | bullist numlist blockquote | alignleft aligncenter alignright alignjustify | link image media table | forecolor backcolor | code',
                toolbar_mode: 'sliding',
                resize: false,
                block_formats: 'Paragraph=p; Heading 2=h2; Heading 3=h3; Heading 4=h4; Quote=blockquote',

                // Plugin configuration
                plugins: FREE_PLUGINS,

                // Image settings
                automatic_uploads: true,
                paste_data_images: true,
                images_file_types: 'jpg,jpeg,png,webp,avif',
                images_upload_handler: uploadTinyMCEImage,

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
                `,
            }}
        />
        </div>
    );
});
