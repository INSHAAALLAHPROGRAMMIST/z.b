// Smart Search Input Component
// Hozirgi header search input'ni yaxshilaydi

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSmartSearch } from '../hooks/useSmartSearch';
import '../styles/components/smart-search.css';

const SmartSearchInput = ({ 
  placeholder = "Kitob qidirish...",
  className = "",
  showSuggestions = true,
  onSearch = null 
}) => {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Smart search hook
  const {
    query,
    suggestions,
    suggestionsLoading,
    setQuery,
    search,
    clear,
    hasSuggestions
  } = useSmartSearch({
    enableSuggestions: showSuggestions,
    maxSuggestions: 5,
    debounceDelay: 300
  });

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
  };

  // Handle search submit
  const handleSearch = (searchQuery = null) => {
    const finalQuery = searchQuery || query;
    
    if (finalQuery.trim()) {
      // Close suggestions
      setIsFocused(false);
      
      // Custom search handler or navigate to search page
      if (onSearch) {
        onSearch(finalQuery);
      } else {
        navigate(`/search?q=${encodeURIComponent(finalQuery)}`);
      }
    }
  };

  // Handle key navigation
  const handleKeyDown = (e) => {
    if (!hasSuggestions) {
      if (e.key === 'Enter') {
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > -1 ? prev - 1 : -1);
        break;
        
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSearch(suggestions[selectedIndex].title);
        } else {
          handleSearch();
        }
        break;
        
      case 'Escape':
        setIsFocused(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    handleSearch(suggestion.title);
  };

  // Handle focus
  const handleFocus = () => {
    setIsFocused(true);
  };

  // Handle blur (with delay for suggestion clicks)
  const handleBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
      setSelectedIndex(-1);
    }, 200);
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target) &&
        !inputRef.current?.contains(event.target)
      ) {
        setIsFocused(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`smart-search-container ${className}`}>
      {/* Search Input */}
      <div className="glassmorphism-input smart-search-input">
        <i className="fas fa-search search-icon"></i>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="search-input-field"
        />
        
        {/* Clear button */}
        {query && (
          <button
            type="button"
            className="clear-search-btn"
            onClick={() => {
              clear();
              inputRef.current?.focus();
            }}
            aria-label="Qidiruvni tozalash"
          >
            <i className="fas fa-times"></i>
          </button>
        )}
        
        {/* Loading indicator */}
        {suggestionsLoading && (
          <div className="search-loading">
            <i className="fas fa-spinner fa-spin"></i>
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && isFocused && hasSuggestions && (
        <div 
          ref={suggestionsRef}
          className="search-suggestions glassmorphism-dropdown"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              className={`suggestion-item ${
                index === selectedIndex ? 'selected' : ''
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {/* Book image */}
              {suggestion.image && (
                <div className="suggestion-image">
                  <img 
                    src={suggestion.image} 
                    alt={suggestion.title}
                    loading="lazy"
                  />
                </div>
              )}
              
              {/* Book info */}
              <div className="suggestion-info">
                <div className="suggestion-title">
                  {highlightMatch(suggestion.title, query)}
                </div>
                {suggestion.author && (
                  <div className="suggestion-author">
                    {suggestion.author}
                  </div>
                )}
                {suggestion.price && (
                  <div className="suggestion-price">
                    {suggestion.price.toLocaleString()} so'm
                  </div>
                )}
              </div>
              
              {/* Search icon */}
              <div className="suggestion-action">
                <i className="fas fa-search"></i>
              </div>
            </div>
          ))}
          
          {/* View all results */}
          <div 
            className="suggestion-item view-all"
            onClick={() => handleSearch()}
          >
            <div className="suggestion-info">
              <div className="suggestion-title">
                "{query}" uchun barcha natijalarni ko'rish
              </div>
            </div>
            <div className="suggestion-action">
              <i className="fas fa-arrow-right"></i>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to highlight matching text
const highlightMatch = (text, query) => {
  if (!query) return text;
  
  const regex = new RegExp(`(${query})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? (
      <mark key={index} className="search-highlight">{part}</mark>
    ) : (
      part
    )
  );
};

export default SmartSearchInput;