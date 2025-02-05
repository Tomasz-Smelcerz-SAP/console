import React from 'react';
import PropTypes from 'prop-types';
import './style.scss';
import 'core-js/es/array/flat-map';

SearchInput.propTypes = {
  searchQuery: PropTypes.string,
  entries: PropTypes.arrayOf(PropTypes.object.isRequired),
  handleQueryChange: PropTypes.func.isRequired,
  suggestionProperties: PropTypes.arrayOf(PropTypes.string.isRequired)
    .isRequired,
};

export default function SearchInput({
  searchQuery,
  filteredEntries,
  handleQueryChange,
  suggestionProperties,
}) {
  const [isSearchHidden, setSearchHidden] = React.useState(true);
  const searchInputRef = React.useRef();

  const renderSearchList = entries => {
    const suggestions = getSearchSuggestions(entries);

    if (!suggestions.length) {
      return (
        <li
          key="no-entries"
          className="fd-menu__item fd-menu__item--no-entries"
        >
          No entries found
        </li>
      );
    }

    return suggestions.map(suggestion => (
      <li
        onClick={() => handleQueryChange(suggestion)}
        key={suggestion}
        className="fd-menu__item"
      >
        {suggestion}
      </li>
    ));
  };

  const getSearchSuggestions = entries => {
    const suggestions = entries
      .flatMap(entry => {
        return suggestionProperties.map(property => {
          const entryValue = entry[property];
          if (entryValue && entryValue.toString().includes(searchQuery)) {
            return entryValue;
          }
          return null;
        });
      })
      .filter(suggestion => suggestion);
    return Array.from(new Set(suggestions));
  };

  const openSearchList = () => {
    const inputField = searchInputRef.current;
    if (inputField !== document.activeElement) {
      inputField.focus();
    }
  };

  const showControl = isSearchHidden && !searchQuery;

  return (
    <div className="fd-search-input generic-list-search">
      <div className="fd-popover">
        <div className="fd-popover__control">
          <div className="fd-combobox-control">
            <input
              ref={searchInputRef}
              type="text"
              className="fd-input"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => handleQueryChange(e.target.value)}
              onFocus={() => setSearchHidden(false)}
              onBlur={() => setSearchHidden(true)}
              className={showControl ? 'control--close' : 'control--open'}
            />
            <button
              className="fd-button--light sap-icon--search"
              onClick={openSearchList}
            />
          </div>
        </div>
        {!!searchQuery && (
          <div
            className="fd-popover__body fd-popover__body--no-arrow"
            aria-hidden={isSearchHidden}
          >
            <nav className="fd-menu">
              <ul className="fd-menu__list">
                {renderSearchList(filteredEntries)}
              </ul>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
