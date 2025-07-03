import React, { useRef, useEffect, useState } from 'react';
import { 
  Bold, 
  Italic, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  List,
  ListOrdered,
  Link,
  Quote,
  Eye,
  Edit3,
  Image,
  ChevronDown,
  ChevronUp
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

  // Initialize content when value changes
  useEffect(() => {
    if (editorRef.current && !isPreviewMode) {
      const currentContent = editorRef.current.innerHTML;
      if (currentContent !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value, isPreviewMode]);

  // Handle content changes
  const handleInput = () => {
    if (editorRef.current && onChange) {
      const content = editorRef.current.innerHTML;
      onChange(content);
    }
  };

  // Execute formatting commands
  const executeCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  // Handle format change
  const handleFormatChange = (format) => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const parentElement = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
        ? range.commonAncestorContainer.parentNode 
        : range.commonAncestorContainer;
      
      if (format === 'p') {
        // For paragraph, use a different approach
        document.execCommand('formatBlock', false, '<div>');
      } else {
        document.execCommand('formatBlock', false, `<${format}>`);
      }
    }
    editorRef.current?.focus();
    handleInput();
  };

  // Handle paste to clean up formatting
  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    handleInput();
  };

  // Insert link
  const insertLink = () => {
    const selection = window.getSelection();
    const selectedText = selection.toString();
    const url = prompt('Enter URL:', 'https://');
    
    if (url && url !== 'https://') {
      if (selectedText) {
        executeCommand('createLink', url);
      } else {
        const linkText = prompt('Enter link text:', url);
        if (linkText) {
          document.execCommand('insertHTML', false, `<a href="${url}">${linkText}</a>`);
          handleInput();
        }
      }
    }
  };

  // Insert media (placeholder for now)
  const insertMedia = () => {
    const url = prompt('Enter image URL:', 'https://');
    if (url && url !== 'https://') {
      document.execCommand('insertHTML', false, `<img src="${url}" alt="" style="max-width: 100%; height: auto;" />`);
      handleInput();
    }
  };

  // Format options
  const formatOptions = [
    { value: 'p', label: 'Paragraph' },
    { value: 'h1', label: 'Heading 1' },
    { value: 'h2', label: 'Heading 2' },
    { value: 'h3', label: 'Heading 3' },
    { value: 'h4', label: 'Heading 4' },
    { value: 'h5', label: 'Heading 5' },
    { value: 'h6', label: 'Heading 6' }
  ];

  return (
    <div className={`border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 ${className}`}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="border-b border-gray-200 dark:border-gray-600 p-2 flex flex-wrap items-center gap-1">
          {/* Media Button */}
          <button
            type="button"
            onClick={insertMedia}
            className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors mr-2"
            title="Add Media"
          >
            <Image className="w-3 h-3 inline mr-1" />
            Add Media
          </button>

          {/* Format Selector */}
          <select
            onChange={(e) => handleFormatChange(e.target.value)}
            className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mr-2"
            title="Format"
          >
            {formatOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Bold */}
          <button
            type="button"
            onClick={() => executeCommand('bold')}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>

          {/* Italic */}
          <button
            type="button"
            onClick={() => executeCommand('italic')}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>

          {/* Bullet List */}
          <button
            type="button"
            onClick={() => executeCommand('insertUnorderedList')}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>

          {/* Numbered List */}
          <button
            type="button"
            onClick={() => executeCommand('insertOrderedList')}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          {/* Blockquote */}
          <button
            type="button"
            onClick={() => executeCommand('formatBlock', 'blockquote')}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
            title="Blockquote"
          >
            <Quote className="w-4 h-4" />
          </button>

          {/* Align Left */}
          <button
            type="button"
            onClick={() => executeCommand('justifyLeft')}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>

          {/* Align Center */}
          <button
            type="button"
            onClick={() => executeCommand('justifyCenter')}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>

          {/* Align Right */}
          <button
            type="button"
            onClick={() => executeCommand('justifyRight')}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </button>

          {/* Insert Link */}
          <button
            type="button"
            onClick={insertLink}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
            title="Insert Link"
          >
            <Link className="w-4 h-4" />
          </button>

          {/* Toolbar Toggle */}
          <button
            type="button"
            onClick={() => setShowToolbar(!showToolbar)}
            className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors ml-auto"
            title="Toggle Toolbar"
          >
            {showToolbar ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Preview Toggle */}
          <button
            type="button"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={`p-1.5 rounded transition-colors ml-1 ${
              isPreviewMode 
                ? 'bg-blue-500 text-white' 
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editor Content */}
      <div className="relative">
        {isPreviewMode ? (
          <div 
            className={`p-4 prose prose-sm dark:prose-invert max-w-none text-gray-900 dark:text-gray-100`}
            style={{ minHeight }}
            dangerouslySetInnerHTML={{ __html: value || `<p class="text-gray-500 dark:text-gray-400">${placeholder}</p>` }}
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
        
        {/* Placeholder styling */}
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
          .prose blockquote {
            border-left: 4px solid #ddd;
            background-color: #f9f9f9;
            margin: 16px 0;
            padding: 16px;
          }
          .dark .prose blockquote {
            border-left-color: #4B5563;
            background-color: #374151;
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