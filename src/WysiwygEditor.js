import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Bold, 
  Italic, 
  Underline,
  Strikethrough,
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Link,
  Unlink,
  Quote,
  Eye,
  Code,
  Image,
  ChevronDown,
  ChevronUp,
  Undo,
  Redo,
  Type,
  Palette,
  Table,
  MoreHorizontal,
  Indent,
  Outdent
} from 'lucide-react';

const WysiwygEditor = ({ 
  value = '', 
  onChange, 
  placeholder = 'Enter content...', 
  className = '',
  isMobile = false,
  minHeight = '150px' 
}) => {
  const editorRef = useRef(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [showAdvancedToolbar, setShowAdvancedToolbar] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [isHTMLMode, setIsHTMLMode] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');

  // Initialize content when value changes
  useEffect(() => {
    if (editorRef.current && !isPreviewMode && !isHTMLMode) {
      const currentContent = editorRef.current.innerHTML;
      if (currentContent !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value, isPreviewMode, isHTMLMode]);

  // Handle content changes
  const handleInput = useCallback(() => {
    if (editorRef.current && onChange && !isHTMLMode) {
      const content = editorRef.current.innerHTML;
      onChange(content);
    }
  }, [onChange, isHTMLMode]);

  // Handle HTML mode changes
  const handleHTMLChange = (newHtml) => {
    setHtmlContent(newHtml);
    if (onChange) {
      onChange(newHtml);
    }
  };

  // Execute formatting commands
  const executeCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  // Handle paste with formatting preservation
  const handlePaste = (e) => {
    e.preventDefault();
    const clipboardData = e.clipboardData || window.clipboardData;
    const pastedData = clipboardData.getData('text/html') || clipboardData.getData('text/plain');
    
    if (pastedData) {
      // Clean up pasted HTML but preserve formatting
      const cleanHtml = pastedData
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<style[^>]*>.*?<\/style>/gi, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .replace(/style="[^"]*"/gi, (match) => {
          // Keep only safe styles
          const safeStyles = match.match(/(font-weight|font-style|text-decoration|color|background-color|text-align|font-size|font-family):[^;]+/gi);
          return safeStyles ? `style="${safeStyles.join(';')}"` : '';
        });
      
      document.execCommand('insertHTML', false, cleanHtml);
      handleInput();
    }
  };

  // Insert/edit link
  const insertLink = () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const selectedText = selection.toString();
      setLinkText(selectedText || '');
      setLinkUrl('');
      setShowLinkDialog(true);
    }
  };

  const applyLink = () => {
    if (linkUrl) {
      if (linkText && window.getSelection().toString() === '') {
        document.execCommand('insertHTML', false, `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`);
      } else {
        document.execCommand('createLink', false, linkUrl);
        // Add target="_blank" and rel attributes
        const links = editorRef.current.querySelectorAll('a[href="' + linkUrl + '"]');
        links.forEach(link => {
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
        });
      }
      handleInput();
    }
    setShowLinkDialog(false);
    setLinkUrl('');
    setLinkText('');
  };

  // Toggle HTML/Visual mode
  const toggleHTMLMode = () => {
    if (isHTMLMode) {
      // Switch back to visual mode
      if (editorRef.current) {
        editorRef.current.innerHTML = htmlContent;
        handleInput();
      }
      setIsHTMLMode(false);
    } else {
      // Switch to HTML mode
      const currentHtml = editorRef.current ? editorRef.current.innerHTML : value;
      setHtmlContent(currentHtml);
      setIsHTMLMode(true);
    }
  };

  // Insert table
  const insertTable = () => {
    const tableHTML = `
      <table border="1" style="border-collapse: collapse; width: 100%;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">Cell 1</td>
          <td style="padding: 8px; border: 1px solid #ddd;">Cell 2</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">Cell 3</td>
          <td style="padding: 8px; border: 1px solid #ddd;">Cell 4</td>
        </tr>
      </table>
    `;
    document.execCommand('insertHTML', false, tableHTML);
    handleInput();
  };

  // Apply text color
  const applyTextColor = (color) => {
    executeCommand('foreColor', color);
    setShowColorPicker(false);
  };

  // Apply background color
  const applyBackgroundColor = (color) => {
    executeCommand('backColor', color);
    setShowColorPicker(false);
  };

  // Handle format block changes properly
  const handleFormatChange = (format) => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      // First remove any existing block formatting
      if (format === 'p') {
        executeCommand('formatBlock', 'div');
        executeCommand('formatBlock', 'p');
      } else {
        // For headings, clear formatting first then apply
        executeCommand('formatBlock', 'p');
        setTimeout(() => {
          executeCommand('formatBlock', format);
        }, 10);
      }
    }
  };

  // Format options for headings and paragraphs
  const formatOptions = [
    { value: 'p', label: 'Paragraph', command: 'formatBlock' },
    { value: 'h1', label: 'Heading 1', command: 'formatBlock' },
    { value: 'h2', label: 'Heading 2', command: 'formatBlock' },
    { value: 'h3', label: 'Heading 3', command: 'formatBlock' },
    { value: 'h4', label: 'Heading 4', command: 'formatBlock' },
    { value: 'h5', label: 'Heading 5', command: 'formatBlock' },
    { value: 'h6', label: 'Heading 6', command: 'formatBlock' },
    { value: 'pre', label: 'Preformatted', command: 'formatBlock' }
  ];

  // Font size options
  const fontSizeOptions = [
    { value: '1', label: '8pt' },
    { value: '2', label: '10pt' },
    { value: '3', label: '12pt' },
    { value: '4', label: '14pt' },
    { value: '5', label: '18pt' },
    { value: '6', label: '24pt' },
    { value: '7', label: '36pt' }
  ];

  // Common colors
  const colors = [
    '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF',
    '#FF0000', '#FF9900', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF',
    '#9900FF', '#FF00FF', '#F4CCCC', '#FCE5CD', '#FFF2CC', '#D9EAD3',
    '#D0E0E3', '#C9DAF8', '#D9D2E9', '#EAD1DC'
  ];

  return (
    <div className={`border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 ${className}`}>
      {/* Main Toolbar */}
      {showToolbar && (
        <div className="border-b border-gray-200 dark:border-gray-600 p-2 flex flex-wrap items-center gap-1">
          {/* Add Media Button */}
          <button
            type="button"
            className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors mr-2"
            title="Add Media"
          >
            <Image className="w-3 h-3 inline mr-1" />
            Add Media
          </button>

          {/* Format Dropdown */}
          <select
            onChange={(e) => handleFormatChange(e.target.value)}
            className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mr-2"
            defaultValue="p"
          >
            {formatOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Font Size */}
          <select
            onChange={(e) => executeCommand('fontSize', e.target.value)}
            className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mr-2"
            defaultValue="3"
          >
            {fontSizeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Text Formatting */}
          <div className="flex items-center gap-1 mr-2">
            <button type="button" onClick={() => executeCommand('bold')} className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors" title="Bold">
              <Bold className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => executeCommand('italic')} className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors" title="Italic">
              <Italic className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => executeCommand('underline')} className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors" title="Underline">
              <Underline className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => executeCommand('strikeThrough')} className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors" title="Strikethrough">
              <Strikethrough className="w-4 h-4" />
            </button>
          </div>

          {/* Color Picker */}
          <div className="relative mr-2">
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
              title="Text Color"
            >
              <Palette className="w-4 h-4" />
            </button>
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50">
                <div className="grid grid-cols-6 gap-1 mb-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => applyTextColor(color)}
                      className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setShowColorPicker(false)}
                  className="text-xs text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                >
                  Close
                </button>
              </div>
            )}
          </div>

          {/* Alignment */}
          <div className="flex items-center gap-1 mr-2">
            <button type="button" onClick={() => executeCommand('justifyLeft')} className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors" title="Align Left">
              <AlignLeft className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => executeCommand('justifyCenter')} className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors" title="Align Center">
              <AlignCenter className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => executeCommand('justifyRight')} className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors" title="Align Right">
              <AlignRight className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => executeCommand('justifyFull')} className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors" title="Justify">
              <AlignJustify className="w-4 h-4" />
            </button>
          </div>

          {/* Lists */}
          <div className="flex items-center gap-1 mr-2">
            <button type="button" onClick={() => executeCommand('insertUnorderedList')} className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors" title="Bullet List">
              <List className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => executeCommand('insertOrderedList')} className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors" title="Numbered List">
              <ListOrdered className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => executeCommand('outdent')} className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors" title="Decrease Indent">
              <Outdent className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => executeCommand('indent')} className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors" title="Increase Indent">
              <Indent className="w-4 h-4" />
            </button>
          </div>

          {/* Quote */}
          <button type="button" onClick={() => executeCommand('formatBlock', 'blockquote')} className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors mr-2" title="Quote">
            <Quote className="w-4 h-4" />
          </button>

          {/* Advanced Tools Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvancedToolbar(!showAdvancedToolbar)}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors mr-2"
            title="More Tools"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {/* Right-aligned controls */}
          <div className="ml-auto flex items-center gap-1">
            {/* Undo/Redo */}
            <button type="button" onClick={() => executeCommand('undo')} className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors" title="Undo">
              <Undo className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => executeCommand('redo')} className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors" title="Redo">
              <Redo className="w-4 h-4" />
            </button>

            {/* HTML/Visual Toggle */}
            <button
              type="button"
              onClick={toggleHTMLMode}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                isHTMLMode 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
              title={isHTMLMode ? 'Visual Editor' : 'HTML Editor'}
            >
              {isHTMLMode ? 'Visual' : 'HTML'}
            </button>

            {/* Preview */}
            <button
              type="button"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={`p-1.5 rounded transition-colors ${
                isPreviewMode 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
              title="Preview"
            >
              <Eye className="w-4 h-4" />
            </button>

            {/* Toolbar Toggle */}
            <button
              type="button"
              onClick={() => setShowToolbar(!showToolbar)}
              className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
              title="Toggle Toolbar"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Advanced Toolbar */}
      {showToolbar && showAdvancedToolbar && (
        <div className="border-b border-gray-200 dark:border-gray-600 p-2 flex flex-wrap items-center gap-1 bg-gray-50 dark:bg-gray-800">
          {/* Link Tools */}
          <div className="flex items-center gap-1 mr-2">
            <button type="button" onClick={insertLink} className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors" title="Insert Link">
              <Link className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => executeCommand('unlink')} className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors" title="Remove Link">
              <Unlink className="w-4 h-4" />
            </button>
          </div>

          {/* Table */}
          <button type="button" onClick={insertTable} className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors mr-2" title="Insert Table">
            <Table className="w-4 h-4" />
          </button>

          {/* Special Characters */}
          <button type="button" onClick={() => executeCommand('insertHTML', '&nbsp;')} className="px-2 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors mr-2" title="Non-breaking Space">
            &nbsp;
          </button>

          {/* Remove Formatting */}
          <button type="button" onClick={() => executeCommand('removeFormat')} className="px-2 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors" title="Clear Formatting">
            Clear Format
          </button>
        </div>
      )}

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="border-b border-gray-200 dark:border-gray-600 p-3 bg-blue-50 dark:bg-blue-900/20">
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Link URL
              </label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            {!window.getSelection().toString() && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Link Text
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Link text"
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={applyLink}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Insert Link
              </button>
              <button
                onClick={() => setShowLinkDialog(false)}
                className="px-3 py-1 text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div className="relative">
        {isPreviewMode ? (
          <div 
            className="p-4 prose prose-sm dark:prose-invert max-w-none text-gray-900 dark:text-gray-100"
            style={{ minHeight }}
            dangerouslySetInnerHTML={{ __html: value || `<p class="text-gray-500 dark:text-gray-400">${placeholder}</p>` }}
          />
        ) : isHTMLMode ? (
          <textarea
            value={htmlContent}
            onChange={(e) => handleHTMLChange(e.target.value)}
            className="w-full p-4 font-mono text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-0 outline-none resize-none"
            style={{ minHeight }}
            placeholder="HTML source code..."
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onPaste={handlePaste}
            className={`p-4 outline-none focus:ring-0 text-gray-900 dark:text-gray-100 ${isMobile ? 'text-base' : ''}`}
            style={{ minHeight }}
            data-placeholder={placeholder}
            suppressContentEditableWarning={true}
          />
        )}
        
        {/* Enhanced Styling */}
        <style>{`
          [contenteditable]:empty:before {
            content: attr(data-placeholder);
            color: #9CA3AF;
            pointer-events: none;
            display: block;
          }
          .dark [contenteditable]:empty:before {
            color: #6B7280;
          }
          
          /* Enhanced blockquote styling */
          [contenteditable] blockquote,
          .prose blockquote {
            border-left: 4px solid #3B82F6;
            background-color: #F8FAFC;
            margin: 16px 0;
            padding: 16px;
            font-style: italic;
            position: relative;
          }
          .dark [contenteditable] blockquote,
          .dark .prose blockquote {
            border-left-color: #60A5FA;
            background-color: #1E293B;
            color: #E2E8F0;
          }
          
          /* Table styling */
          [contenteditable] table,
          .prose table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
          }
          [contenteditable] table td,
          [contenteditable] table th,
          .prose table td,
          .prose table th {
            border: 1px solid #D1D5DB;
            padding: 8px 12px;
            text-align: left;
          }
          .dark [contenteditable] table td,
          .dark [contenteditable] table th,
          .dark .prose table td,
          .dark .prose table th {
            border-color: #4B5563;
          }
          [contenteditable] table th,
          .prose table th {
            background-color: #F3F4F6;
            font-weight: 600;
          }
          .dark [contenteditable] table th,
          .dark .prose table th {
            background-color: #374151;
          }
          
          /* Heading styles */
          [contenteditable] h1 { font-size: 2em; font-weight: bold; margin: 16px 0 8px 0; }
          [contenteditable] h2 { font-size: 1.5em; font-weight: bold; margin: 14px 0 7px 0; }
          [contenteditable] h3 { font-size: 1.3em; font-weight: bold; margin: 12px 0 6px 0; }
          [contenteditable] h4 { font-size: 1.1em; font-weight: bold; margin: 10px 0 5px 0; }
          [contenteditable] h5 { font-size: 1em; font-weight: bold; margin: 8px 0 4px 0; }
          [contenteditable] h6 { font-size: 0.9em; font-weight: bold; margin: 6px 0 3px 0; }
          
          /* List styles */
          [contenteditable] ul,
          [contenteditable] ol {
            margin: 12px 0;
            padding-left: 24px;
          }
          [contenteditable] li {
            margin: 4px 0;
          }
          
          /* Preformatted text */
          [contenteditable] pre {
            background-color: #F3F4F6;
            border: 1px solid #D1D5DB;
            border-radius: 4px;
            padding: 12px;
            font-family: 'Courier New', monospace;
            overflow-x: auto;
            white-space: pre-wrap;
            margin: 16px 0;
          }
          .dark [contenteditable] pre {
            background-color: #1F2937;
            border-color: #4B5563;
            color: #E5E7EB;
          }
          
          /* Link styles */
          [contenteditable] a {
            color: #3B82F6;
            text-decoration: underline;
          }
          [contenteditable] a:hover {
            color: #1D4ED8;
          }
          .dark [contenteditable] a {
            color: #60A5FA;
          }
          .dark [contenteditable] a:hover {
            color: #93C5FD;
          }
        `}</style>
      </div>

      {/* Collapsed Toolbar Indicator */}
      {!showToolbar && (
        <div className="border-t border-gray-200 dark:border-gray-600 p-1 flex justify-center">
          <button
            type="button"
            onClick={() => setShowToolbar(true)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Show Toolbar"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default WysiwygEditor;