import React, { useRef, useEffect, useState } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  List,
  ListOrdered,
  Link,
  Unlink,
  Eye,
  Edit3,
  Type,
  Palette
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
  const [showColorPicker, setShowColorPicker] = useState(false);

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

  // Handle paste to clean up formatting
  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    handleInput();
  };

  // Insert link
  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      executeCommand('createLink', url);
    }
  };

  // Formatting buttons configuration
  const formatButtons = [
    { command: 'bold', icon: Bold, title: 'Bold' },
    { command: 'italic', icon: Italic, title: 'Italic' },
    { command: 'underline', icon: Underline, title: 'Underline' },
    { command: 'justifyLeft', icon: AlignLeft, title: 'Align Left' },
    { command: 'justifyCenter', icon: AlignCenter, title: 'Align Center' },
    { command: 'justifyRight', icon: AlignRight, title: 'Align Right' },
    { command: 'insertUnorderedList', icon: List, title: 'Bullet List' },
    { command: 'insertOrderedList', icon: ListOrdered, title: 'Numbered List' },
  ];

  const headingOptions = [
    { value: 'p', label: 'Paragraph' },
    { value: 'h1', label: 'Heading 1' },
    { value: 'h2', label: 'Heading 2' },
    { value: 'h3', label: 'Heading 3' },
    { value: 'h4', label: 'Heading 4' }
  ];

  const colors = [
    '#000000', '#333333', '#666666', '#999999', '#CCCCCC',
    '#FF0000', '#FF6600', '#FFCC00', '#00FF00', '#0066FF',
    '#6600FF', '#FF0066', '#FF9999', '#99FF99', '#9999FF'
  ];

  return (
    <div className={`border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 ${className}`}>
      {/* Toolbar */}
      <div className="border-b border-gray-200 dark:border-gray-600 p-2 flex flex-wrap items-center gap-1">
        {/* View Mode Toggle */}
        <div className="flex rounded border border-gray-200 dark:border-gray-600 mr-2">
          <button
            type="button"
            onClick={() => setIsPreviewMode(false)}
            className={`px-2 py-1 text-xs flex items-center ${
              !isPreviewMode 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
            }`}
            title="Edit Mode"
          >
            <Edit3 className="w-3 h-3 mr-1" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setIsPreviewMode(true)}
            className={`px-2 py-1 text-xs flex items-center ${
              isPreviewMode 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
            }`}
            title="Preview Mode"
          >
            <Eye className="w-3 h-3 mr-1" />
            Preview
          </button>
        </div>

        {!isPreviewMode && (
          <>
            {/* Heading Selector */}
            <select
              onChange={(e) => executeCommand('formatBlock', e.target.value)}
              className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mr-2"
              title="Text Format"
            >
              {headingOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Format Buttons */}
            {formatButtons.map(({ command, icon: Icon, title }) => (
              <button
                key={command}
                type="button"
                onClick={() => executeCommand(command)}
                className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                title={title}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}

            {/* Color Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                title="Text Color"
              >
                <Palette className="w-4 h-4" />
              </button>
              {showColorPicker && (
                <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-lg z-10">
                  <div className="grid grid-cols-5 gap-1 w-32">
                    {colors.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          executeCommand('foreColor', color);
                          setShowColorPicker(false);
                        }}
                        className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Link Buttons */}
            <div className="border-l border-gray-200 dark:border-gray-600 ml-2 pl-2">
              <button
                type="button"
                onClick={insertLink}
                className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors mr-1"
                title="Insert Link"
              >
                <Link className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('unlink')}
                className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                title="Remove Link"
              >
                <Unlink className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Editor/Preview Content */}
      <div className="relative">
        {isPreviewMode ? (
          <div 
            className={`p-4 prose prose-sm dark:prose-invert max-w-none min-h-[${minHeight}] text-gray-900 dark:text-gray-100`}
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
        <style jsx>{`
          [contenteditable]:empty:before {
            content: attr(data-placeholder);
            color: #9CA3AF;
            pointer-events: none;
            display: block;
          }
          .dark [contenteditable]:empty:before {
            color: #6B7280;
          }
        `}</style>
      </div>
    </div>
  );
};

export default WysiwygEditor;