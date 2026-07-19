/**
 * input-forms.js
 *
 * A compositional form generator based on JSON schema.
 * Supports arbitrary nesting of types: fixedList, dynamicList, struct, and primitives.
 */

const { inputCreate } = (() => {
  /**
   * Save configuration to localStorage
   */
  function saveToLocalStorage(key, config) {
    try {
      localStorage.setItem(key, JSON.stringify(config));
      return true;
    } catch (e) {
      console.error("Failed to save to localStorage:", e);
      return false;
    }
  }

  /**
   * Load configuration from localStorage
   */
  function loadFromLocalStorage(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error("Failed to load from localStorage:", e);
      return null;
    }
  }

  /**
   * Normalize type aliases to canonical type names
   */
  function normalizeType(type) {
    const aliases = {
      checkbox: "boolean",
      string: "text",
    };
    return aliases[type] || type;
  }

  /**
   * Check if a type is a primitive type (not a container)
   */
  function isPrimitiveType(type) {
    const normalized = normalizeType(type);
    return [
      "int",
      "float",
      "number",
      "text",
      "boolean",
      "radio",
      "json",
    ].includes(normalized);
  }

  /**
   * Extract input element from a rendered control
   */
  function extractInputFromControl(controlEl) {
    // Check if controlEl itself is the field element
    if (controlEl.hasAttribute && controlEl.hasAttribute("data-field-id")) {
      return controlEl;
    }
    // For controls with data-field-id (like radio button groups), return that element
    const fieldElement = controlEl.querySelector("[data-field-id]");
    if (fieldElement) {
      return fieldElement;
    }
    // Otherwise, return the first input element
    const input = controlEl.querySelector("input, select, textarea");
    return input;
  }

  /**
   * Convert path array to CSS-safe string
   */
  function pathToString(path) {
    return path.join(".");
  }

  /**
   * Find an element by field ID and path
   */
  function findElement(container, fieldId, path) {
    const pathStr = pathToString(path);
    return container.querySelector(
      `[data-field-id="${fieldId}"][data-field-path="${pathStr}"]`,
    );
  }

  /**
   * Get default configuration from schema
   */
  function getDefaultConfig(schema) {
    const config = {};

    // Get presets
    if (schema.presets) {
      Object.keys(schema.presets).forEach((key) => {
        config[key] = schema.presets[key];
      });
    }

    // Get defaults from controls
    schema.sections?.forEach((section) => {
      section.controls?.forEach((control) => {
        if (
          control.id &&
          control.default !== undefined &&
          control.type !== "import-export" &&
          control.type !== "preset-selector" &&
          control.type !== "label"
        ) {
          config[control.id] = JSON.parse(JSON.stringify(control.default));
        }
      });
    });

    return config;
  }

  /**
   * Get default value for an item type
   */
  function getItemDefault(itemType) {
    if (itemType.default !== undefined) {
      return JSON.parse(JSON.stringify(itemType.default));
    }

    const type = normalizeType(itemType.type);
    switch (type) {
      case "int":
      case "float":
      case "number":
        return 0;
      case "text":
        return "";
      case "boolean":
        return false;
      case "json":
        return null;
      case "fixedList":
        return itemType.default || [];
      case "dynamicList":
        return itemType.default || [];
      case "struct":
        return getDefaultConfig({ sections: [{ controls: itemType.fields }] });
      default:
        return null;
    }
  }

  /**
   * Get current configuration from the form
   */
  function getCurrentConfig(schema, container) {
    const config = {};

    // Get presets
    if (schema.presets) {
      Object.keys(schema.presets).forEach((key) => {
        config[key] = schema.presets[key];
      });
    }

    // Get values from controls
    schema.sections?.forEach((section) => {
      section.controls?.forEach((control) => {
        if (
          control.id &&
          control.type !== "import-export" &&
          control.type !== "preset-selector" &&
          control.type !== "label"
        ) {
          const value = getControlValue(control, container, []);
          if (value !== undefined) {
            config[control.id] = value;
          }
        }
      });
    });

    return config;
  }

  /**
   * Get value from a control
   */
  function getControlValue(control, container, path) {
    const element = findElement(container, control.id, path);

    if (!element) {
      return control.default;
    }

    const type = normalizeType(control.type);
    switch (type) {
      case "int":
        return parseInt(element.value) || 0;
      case "float":
      case "number":
        return parseFloat(element.value) || 0;
      case "text":
        return element.value;
      case "boolean":
        return element.checked;
      case "radio": {
        const checked = element.querySelector("input:checked");
        return checked ? checked.value : control.default;
      }
      case "json": {
        try {
          return JSON.parse(element.value);
        } catch (e) {
          return control.default;
        }
      }
      case "fixedList": {
        const items = element.querySelectorAll("[data-list-index]");
        const values = [];
        items.forEach((item, index) => {
          const itemControl = {
            ...control.itemType,
            id: `item-${index}`,
          };
          const value = getControlValue(itemControl, item, [
            ...path,
            control.id,
            index,
          ]);
          values.push(value);
        });
        return values;
      }
      case "dynamicList": {
        const listContainer = element.querySelector("[data-list-container]");
        if (!listContainer) return control.default || [];

        const items = listContainer.children;
        const values = [];
        Array.from(items).forEach((item, index) => {
          const itemControl = {
            ...control.itemType,
            id: `item-${index}`,
          };
          const value = getControlValue(itemControl, item, [
            ...path,
            control.id,
            index,
          ]);
          values.push(value);
        });
        return values;
      }
      case "struct": {
        const values = {};
        control.fields?.forEach((field) => {
          if (field.id && field.type !== "label") {
            const fieldPath = control.id ? [...path, control.id] : path;
            const value = getControlValue(field, element, fieldPath);
            if (value !== undefined) {
              values[field.id] = value;
            }
          }
        });
        return values;
      }
      default:
        return control.default;
    }
  }

  /**
   * Set configuration to the form
   */
  function setConfig(schema, container, config, functions) {
    schema.sections?.forEach((section) => {
      section.controls?.forEach((control) => {
        if (
          control.id &&
          control.type !== "import-export" &&
          control.type !== "preset-selector" &&
          control.type !== "label"
        ) {
          const value = config[control.id];
          if (value !== undefined) {
            setControlValue(control, container, [], value, functions);
          }
        }
      });
    });
  }

  /**
   * Set value to a control
   */
  function setControlValue(control, container, path, value, functions) {
    const element = findElement(container, control.id, path);

    if (!element) {
      return;
    }

    const type = normalizeType(control.type);
    switch (type) {
      case "int":
      case "float":
      case "number":
        element.value = value;
        // Trigger display update
        if (control.displayFunction && control.displayId) {
          const fn = functions[control.displayFunction];
          const displaySpan = document.getElementById(control.displayId);
          if (fn && displaySpan) {
            displaySpan.textContent = fn(value);
          }
        }
        break;
      case "text":
        element.value = value;
        break;
      case "boolean":
        element.checked = value;
        break;
      case "radio": {
        const radio = element.querySelector(`input[value="${value}"]`);
        if (radio) {
          radio.checked = true;
        }
        break;
      }
      case "json":
        element.value = JSON.stringify(value);
        break;
      case "fixedList": {
        const items = element.querySelectorAll("[data-list-index]");
        items.forEach((item, index) => {
          if (value[index] !== undefined) {
            const itemControl = {
              ...control.itemType,
              id: `item-${index}`,
            };
            setControlValue(
              itemControl,
              item,
              [...path, control.id, index],
              value[index],
              functions,
            );
          }
        });
        break;
      }
      case "dynamicList": {
        const listContainer = element.querySelector("[data-list-container]");
        if (!listContainer) return;

        // Clear existing items
        listContainer.innerHTML = "";

        // Add items from value
        if (Array.isArray(value)) {
          value.forEach((itemValue, index) => {
            const itemEl = renderDynamicListItem(
              control,
              listContainer._schema,
              listContainer._functions,
              listContainer._path,
              index,
              itemValue,
              listContainer._rootContainer,
            );
            listContainer.appendChild(itemEl);

            // Set the value
            const itemControl = {
              ...control.itemType,
              id: `item-${index}`,
            };
            setControlValue(
              itemControl,
              itemEl,
              [...path, control.id, index],
              itemValue,
              functions,
            );
          });
        }
        break;
      }
      case "struct": {
        control.fields?.forEach((field) => {
          if (
            field.id &&
            field.type !== "label" &&
            value[field.id] !== undefined
          ) {
            const fieldPath = control.id ? [...path, control.id] : path;
            setControlValue(
              field,
              element,
              fieldPath,
              value[field.id],
              functions,
            );
          }
        });
        break;
      }
    }
  }

  /**
   * Render a static label
   */
  function renderLabel(control) {
    const div = document.createElement("div");
    div.textContent = control.text;
    if (control.cssClass) {
      div.className = control.cssClass;
    }
    return div;
  }

  /**
   * Render a number input (int, float, or number)
   */
  function renderNumber(control, path, container, functions) {
    const div = document.createElement("div");
    div.className = "config-row";

    if (control.label) {
      const label = document.createElement("label");
      label.textContent = control.label;
      div.appendChild(label);
    }

    const inputContainer = document.createElement("div");
    inputContainer.style.display = "flex";
    inputContainer.style.gap = "0.5em";

    const input = document.createElement("input");
    input.type = "number";
    input.setAttribute("data-field-id", control.id);
    input.setAttribute("data-field-path", pathToString(path));

    if (control.min !== undefined) input.min = control.min;
    if (control.max !== undefined) input.max = control.max;
    if (control.step !== undefined) {
      input.step = control.step;
    } else if (control.type === "int") {
      input.step = 1;
    } else if (control.type === "float") {
      input.step = "any";
    } else {
      input.step = "any";
    }

    if (control.default !== undefined) {
      input.value = control.default;
    }

    inputContainer.appendChild(input);

    // Display element (like tonic name)
    if (control.displayFunction && control.displayId) {
      const displaySpan = document.createElement("span");
      displaySpan.id = control.displayId;
      inputContainer.appendChild(displaySpan);
    }

    // Action buttons
    if (control.actions) {
      control.actions.forEach((action) => {
        const btn = document.createElement("button");
        btn.textContent = action.label;
        btn.onclick = () => {
          const fn = functions[action.functionName];
          if (fn) fn();
        };
        inputContainer.appendChild(btn);
      });
    }

    // Setup display function
    if (control.displayFunction && control.displayId) {
      const updateDisplay = () => {
        const fn = functions[control.displayFunction];
        const displaySpan = document.getElementById(control.displayId);
        if (fn && displaySpan) {
          displaySpan.textContent = fn(parseFloat(input.value));
        }
      };
      input.addEventListener("input", updateDisplay);
      // Initial update will happen in setConfig
    }

    div.appendChild(inputContainer);

    if (control.cssClass) {
      div.className += " " + control.cssClass;
    }

    return div;
  }

  /**
   * Render a text input
   */
  function renderText(control, path) {
    const div = document.createElement("div");
    div.className = "config-row";

    if (control.label) {
      const label = document.createElement("label");
      label.textContent = control.label;
      div.appendChild(label);
    }

    const input = document.createElement("input");
    input.type = "text";
    input.setAttribute("data-field-id", control.id);
    input.setAttribute("data-field-path", pathToString(path));

    if (control.placeholder) {
      input.placeholder = control.placeholder;
    }

    if (control.default !== undefined) {
      input.value = control.default;
    }

    div.appendChild(input);

    if (control.cssClass) {
      div.className += " " + control.cssClass;
    }

    return div;
  }

  /**
   * Render a checkbox
   */
  function renderCheckbox(control, path) {
    const div = document.createElement("div");
    div.className = "config-row";

    const label = document.createElement("label");

    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("data-field-id", control.id);
    input.setAttribute("data-field-path", pathToString(path));

    if (control.default !== undefined) {
      input.checked = control.default;
    }

    label.appendChild(input);

    if (control.label) {
      label.appendChild(document.createTextNode(" " + control.label));
    }

    div.appendChild(label);

    if (control.cssClass) {
      div.className += " " + control.cssClass;
    }

    return div;
  }

  /**
   * Render a radio button group
   */
  function renderRadio(control, path) {
    const div = document.createElement("div");
    div.className = "config-row";

    if (control.label) {
      const label = document.createElement("label");
      label.textContent = control.label;
      div.appendChild(label);
    }

    const radioContainer = document.createElement("div");
    radioContainer.className = control.cssClass || "radio-group";
    radioContainer.setAttribute("data-field-id", control.id);
    radioContainer.setAttribute("data-field-path", pathToString(path));

    const name = `radio-${control.id}-${path.join("-")}`;

    control.options.forEach((option) => {
      const label = document.createElement("label");

      const input = document.createElement("input");
      input.type = "radio";
      input.name = name;
      input.value = option.value;

      if (control.default === option.value) {
        input.checked = true;
      }

      label.appendChild(input);
      label.appendChild(
        document.createTextNode(" " + (option.label || option.value)),
      );

      radioContainer.appendChild(label);
    });

    div.appendChild(radioContainer);

    return div;
  }

  /**
   * Render a JSON input
   */
  function renderJson(control, path) {
    const div = document.createElement("div");
    div.className = "config-row";

    if (control.label) {
      const label = document.createElement("label");
      label.textContent = control.label;
      div.appendChild(label);
    }

    const input = document.createElement("input");
    input.type = "text";
    input.setAttribute("data-field-id", control.id);
    input.setAttribute("data-field-path", pathToString(path));
    input.setAttribute("data-field-type", "json");

    if (control.default !== undefined) {
      input.value = JSON.stringify(control.default);
    }

    div.appendChild(input);

    if (control.cssClass) {
      div.className += " " + control.cssClass;
    }

    return div;
  }

  /**
   * Render a fixed-length list
   */
  function renderFixedList(control, schema, functions, path, rootContainer) {
    const div = document.createElement("div");
    div.setAttribute("data-field-id", control.id);
    div.setAttribute("data-field-path", pathToString(path));
    div.setAttribute("data-field-type", "fixedList");

    if (control.label) {
      const label = document.createElement("div");
      label.textContent = control.label;
      div.appendChild(label);
    }

    const container = document.createElement("div");
    container.className = control.cssClass || "fixed-list";

    const labels = control.labels || [];
    const defaults = control.default || [];

    labels.forEach((label, index) => {
      const itemDiv = document.createElement("div");
      itemDiv.className = "list-item";
      itemDiv.setAttribute("data-list-index", index);

      const itemLabel = document.createElement("label");
      itemLabel.textContent = label;
      itemDiv.appendChild(itemLabel);

      // Create item control without label (we provide it above)
      const itemControl = {
        ...control.itemType,
        id: `item-${index}`,
        label: undefined, // Remove label since we provide it
        default: defaults[index],
      };

      const itemPath = [...path, control.id, index];
      const itemEl = renderControl(
        itemControl,
        schema,
        functions,
        itemPath,
        rootContainer,
      );

      if (itemEl) {
        // For primitive types, extract just the input (except radio which needs the whole group)
        if (
          isPrimitiveType(control.itemType.type) &&
          normalizeType(control.itemType.type) !== "radio"
        ) {
          const input = extractInputFromControl(itemEl);
          if (input) {
            itemDiv.appendChild(input);
          } else {
            itemDiv.appendChild(itemEl);
          }
        } else {
          // For radio and complex types, append the whole element
          itemDiv.appendChild(itemEl);
        }
      }

      container.appendChild(itemDiv);
    });

    div.appendChild(container);

    return div;
  }

  /**
   * Render a single item in a dynamic list
   */
  function renderDynamicListItem(
    control,
    schema,
    functions,
    path,
    index,
    itemDefault,
    rootContainer,
  ) {
    const itemDiv = document.createElement("div");
    itemDiv.className = "dynamic-list-item";
    itemDiv.setAttribute("data-list-index", index);

    // Get label
    let label = "";
    if (control.labels && control.labels[index]) {
      label = control.labels[index];
    } else if (control.labelFunction) {
      const fn = functions[control.labelFunction];
      if (fn) {
        label = fn(index);
      }
    }

    if (label) {
      const labelEl = document.createElement("label");
      labelEl.textContent = label;
      itemDiv.appendChild(labelEl);
    }

    // Create item control without label for primitives
    const itemControl = {
      ...control.itemType,
      id: `item-${index}`,
      label: label ? undefined : control.itemType.label, // Remove label if we provide it
      default: itemDefault,
    };

    const itemPath = [...path, control.id, index];
    const itemEl = renderControl(
      itemControl,
      schema,
      functions,
      itemPath,
      rootContainer,
    );

    if (itemEl) {
      // For primitive types, extract just the input (except radio which needs the whole group)
      if (
        isPrimitiveType(control.itemType.type) &&
        normalizeType(control.itemType.type) !== "radio"
      ) {
        const input = extractInputFromControl(itemEl);
        if (input) {
          itemDiv.appendChild(input);
        } else {
          itemDiv.appendChild(itemEl);
        }
      } else {
        // For radio and complex types, append the whole element
        itemDiv.appendChild(itemEl);
      }
    }

    // Remove button (only for "eachElement" and "eachAndLast" modes)
    const removeType = control.removeType || "eachElement";
    if (removeType === "eachElement" || removeType === "eachAndLast") {
      const removeBtn = document.createElement("button");
      removeBtn.textContent = control.removeButtonLabel || "-";
      removeBtn.className = "remove-item";
      removeBtn.onclick = () => {
        const minLength = control.minLength || 0;
        const container = itemDiv.parentElement;
        if (container.children.length > minLength) {
          itemDiv.remove();
        }
      };
      itemDiv.appendChild(removeBtn);
    }

    return itemDiv;
  }

  /**
   * Render a dynamic-length list
   */
  function renderDynamicList(control, schema, functions, path, rootContainer) {
    const div = document.createElement("div");
    div.setAttribute("data-field-id", control.id);
    div.setAttribute("data-field-path", pathToString(path));
    div.setAttribute("data-field-type", "dynamicList");

    if (control.label) {
      const label = document.createElement("div");
      label.textContent = control.label;
      div.appendChild(label);
    }

    const container = document.createElement("div");
    container.className = control.cssClass || "dynamic-list";
    container.setAttribute("data-list-container", control.id);

    // Store control spec on container for later use
    container._controlSpec = control;
    container._schema = schema;
    container._functions = functions;
    container._path = path;
    container._rootContainer = rootContainer;

    div.appendChild(container);

    // Add button
    const addBtn = document.createElement("button");
    addBtn.textContent = control.addButtonLabel || "+";
    addBtn.onclick = () => {
      const currentCount = container.children.length;
      const itemEl = renderDynamicListItem(
        control,
        schema,
        functions,
        path,
        currentCount,
        getItemDefault(control.itemType),
        rootContainer,
      );
      container.appendChild(itemEl);
    };
    div.appendChild(addBtn);

    // Remove last button (for "onlyLast" and "eachAndLast" modes)
    const removeType = control.removeType || "eachElement";
    if (removeType === "onlyLast" || removeType === "eachAndLast") {
      const removeLastBtn = document.createElement("button");
      removeLastBtn.textContent = control.removeButtonLabel || "-";
      removeLastBtn.className = "remove-last-item";
      removeLastBtn.onclick = () => {
        const minLength = control.minLength || 0;
        if (container.children.length > minLength) {
          const lastChild = container.lastElementChild;
          if (lastChild) {
            lastChild.remove();
          }
        }
      };
      div.appendChild(removeLastBtn);
    }

    // Initialize with default items
    if (control.default && Array.isArray(control.default)) {
      control.default.forEach((itemDefault, index) => {
        const itemEl = renderDynamicListItem(
          control,
          schema,
          functions,
          path,
          index,
          itemDefault,
          rootContainer,
        );
        container.appendChild(itemEl);
      });
    }

    return div;
  }

  /**
   * Render a struct
   */
  function renderStruct(control, schema, functions, path, rootContainer) {
    const div = document.createElement("div");
    div.setAttribute("data-field-id", control.id);
    div.setAttribute("data-field-path", pathToString(path));
    div.setAttribute("data-field-type", "struct");

    if (control.cssClass) {
      div.className = control.cssClass;
    }

    if (control.label) {
      const label = document.createElement("div");
      label.textContent = control.label;
      div.appendChild(label);
    }

    if (control.fields) {
      control.fields.forEach((field) => {
        const fieldPath = control.id ? [...path, control.id] : path;
        const fieldEl = renderControl(
          field,
          schema,
          functions,
          fieldPath,
          rootContainer,
        );
        if (fieldEl) {
          div.appendChild(fieldEl);
        }
      });
    }

    return div;
  }

  /**
   * Render import/export controls
   */
  function renderImportExport(control, schema, functions, container) {
    const div = document.createElement("div");
    div.className = "config-io";

    const textarea = document.createElement("textarea");
    textarea.id = "configIO";
    textarea.rows = 4;
    div.appendChild(textarea);

    const buttonsDiv = document.createElement("div");
    buttonsDiv.className = "config-io-buttons";

    const exportBtn = document.createElement("button");
    exportBtn.textContent = "Export Config";
    exportBtn.onclick = () => {
      const api = container._formAPI;
      if (api && api.exportConfig) {
        api.exportConfig();
      }
    };
    buttonsDiv.appendChild(exportBtn);

    const importBtn = document.createElement("button");
    importBtn.textContent = "Import Config";
    importBtn.onclick = () => {
      const api = container._formAPI;
      if (api && api.importConfig) {
        api.importConfig();
      }
    };
    buttonsDiv.appendChild(importBtn);

    const resetBtn = document.createElement("button");
    resetBtn.textContent = "Reset to Default";
    resetBtn.onclick = () => {
      const api = container._formAPI;
      if (api && api.resetConfig) {
        api.resetConfig();
      }
    };
    buttonsDiv.appendChild(resetBtn);

    div.appendChild(buttonsDiv);

    return div;
  }

  /**
   * Render preset selector
   */
  function renderPresetSelector(control, schema, functions, container) {
    const div = document.createElement("div");
    div.className = "preset-controls";

    const select = document.createElement("select");
    const selectId = `preset-${control.targetField}`;
    select.id = selectId;

    // Populate presets
    const presets = schema.presets?.[control.presetSource] || {};
    Object.keys(presets).forEach((presetName) => {
      const option = document.createElement("option");
      option.value = presetName;
      option.textContent = presetName;
      select.appendChild(option);
    });

    div.appendChild(select);

    const applyBtn = document.createElement("button");
    applyBtn.textContent = "Apply Preset";
    applyBtn.onclick = () => {
      const presetName = select.value;
      const presetValue = presets[presetName];
      if (presetValue !== undefined) {
        const api = container._formAPI;
        if (api && api.getCurrentConfig && api.setConfig) {
          const currentConfig = api.getCurrentConfig();
          currentConfig[control.targetField] = JSON.parse(
            JSON.stringify(presetValue),
          );
          api.setConfig(currentConfig);
        }
      }
    };
    div.appendChild(applyBtn);

    // Save preset section
    const saveDiv = document.createElement("div");
    saveDiv.className = "save-preset";

    const saveInput = document.createElement("input");
    saveInput.type = "text";
    saveInput.placeholder = "New preset name";
    saveDiv.appendChild(saveInput);

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save As Preset";
    saveBtn.onclick = () => {
      const presetName = saveInput.value.trim();
      if (!presetName) {
        alert("Please enter a preset name");
        return;
      }

      const api = container._formAPI;
      if (api && api.getCurrentConfig) {
        const currentConfig = api.getCurrentConfig();
        const value = currentConfig[control.targetField];

        // Add to presets
        if (!schema.presets[control.presetSource]) {
          schema.presets[control.presetSource] = {};
        }
        schema.presets[control.presetSource][presetName] = JSON.parse(
          JSON.stringify(value),
        );

        // Add to select
        const option = document.createElement("option");
        option.value = presetName;
        option.textContent = presetName;
        select.appendChild(option);
        select.value = presetName;

        saveInput.value = "";
      }
    };
    saveDiv.appendChild(saveBtn);

    div.appendChild(saveDiv);

    return div;
  }

  /**
   * Render a control based on its type
   * @param {Object} control - The control specification
   * @param {Object} schema - The full schema (for presets, etc.)
   * @param {Object} functions - User-provided functions
   * @param {Array} path - Path to this control (for nested structures)
   * @param {HTMLElement} container - The root container element
   */
  function renderControl(control, schema, functions, path, container) {
    const type = normalizeType(control.type);

    switch (type) {
      case "import-export":
        return renderImportExport(control, schema, functions, container);
      case "preset-selector":
        return renderPresetSelector(control, schema, functions, container);
      case "label":
        return renderLabel(control);
      case "int":
      case "float":
      case "number":
        return renderNumber(control, path, container, functions);
      case "text":
        return renderText(control, path);
      case "boolean":
        return renderCheckbox(control, path);
      case "radio":
        return renderRadio(control, path);
      case "json":
        return renderJson(control, path);
      case "fixedList":
        return renderFixedList(control, schema, functions, path, container);
      case "dynamicList":
        return renderDynamicList(control, schema, functions, path, container);
      case "struct":
        return renderStruct(control, schema, functions, path, container);
      default:
        console.warn(`Unknown control type: ${type}`);
        return null;
    }
  }

  /**
   * Render a section
   */
  function renderSection(section, schema, functions, container) {
    const div = document.createElement("div");
    if (section.cssClass) {
      div.className = section.cssClass;
    }

    if (section.title) {
      const title = document.createElement("h3");
      title.textContent = section.title;
      div.appendChild(title);
    }

    if (section.controls) {
      section.controls.forEach((control) => {
        const controlEl = renderControl(
          control,
          schema,
          functions,
          [],
          container,
        );
        if (controlEl) {
          div.appendChild(controlEl);
        }
      });
    }

    return div;
  }

  /**
   * Create a form from a JSON schema.
   *
   * @param {Object} schema - The JSON schema configuration
   * @param {string} selector - CSS selector for the container element
   * @param {Object} options - Options object with { functions: {...} }
   * @returns {Object} API with getCurrentConfig, setConfig, resetConfig, exportConfig, importConfig
   */
  function inputCreate(schema, selector, options = {}) {
    const functions = options.functions || {};
    const autoSaveKey = options.autoSaveKey || null;
    const initialLoadFromAutoSave = options.initialLoadFromAutoSave || false;
    const container = document.querySelector(selector);

    if (!container) {
      throw new Error(`Element not found for selector: ${selector}`);
    }

    // Store schema and functions on container for later access
    container._formSchema = schema;
    container._formFunctions = functions;
    container.setAttribute("data-form-root", "true");

    // Clear container
    container.innerHTML = "";

    // Add title if present
    if (schema.title) {
      const title = document.createElement("h2");
      title.textContent = schema.title;
      container.appendChild(title);
    }

    // Create API object early so render functions can reference it
    const api = {
      getCurrentConfig: null,
      setConfig: null,
      resetConfig: null,
      exportConfig: null,
      importConfig: null,
    };

    // Store API on container before rendering
    container._formAPI = api;

    // Render sections
    if (schema.sections) {
      schema.sections.forEach((section) => {
        const sectionEl = renderSection(section, schema, functions, container);
        container.appendChild(sectionEl);
      });
    }

    // Populate API methods
    api.getCurrentConfig = () => getCurrentConfig(schema, container);
    api.setConfig = (config, skipAutoSave = false) => {
      setConfig(schema, container, config, functions);
      if (autoSaveKey && !skipAutoSave) {
        saveToLocalStorage(autoSaveKey, config);
      }
    };
    api.resetConfig = () => {
      const defaultConfig = getDefaultConfig(schema);
      api.setConfig(defaultConfig);
    };
    api.exportConfig = () => {
      const configIO = container.querySelector("#configIO");
      if (configIO) {
        configIO.value = JSON.stringify(api.getCurrentConfig(), null, 2);
      }
    };
    api.importConfig = () => {
      const configIO = container.querySelector("#configIO");
      if (configIO) {
        try {
          const config = JSON.parse(configIO.value);
          api.setConfig(config);
        } catch (e) {
          alert("Error importing configuration: " + e.message);
        }
      }
    };
    api.saveCurrentConfigToLocalStorage = (key) => {
      const config = api.getCurrentConfig();
      return saveToLocalStorage(key, config);
    };
    api.loadCurrentConfigFromLocalStorage = (key) => {
      const config = loadFromLocalStorage(key);
      if (config !== null) {
        api.setConfig(config, true); // Skip auto-save when loading
        return true;
      }
      return false;
    };

    // Apply default configuration or load from auto-save
    if (initialLoadFromAutoSave && autoSaveKey) {
      const loaded = api.loadCurrentConfigFromLocalStorage(autoSaveKey);
      if (!loaded) {
        // If load failed, apply defaults
        api.resetConfig();
      }
    } else {
      // Apply default configuration to ensure all nested values are properly set
      api.resetConfig();
    }

    // Set up auto-save if key provided
    if (autoSaveKey) {
      const inputs = container.querySelectorAll("input, select, textarea");
      inputs.forEach((input) => {
        input.addEventListener("change", () => {
          api.saveCurrentConfigToLocalStorage(autoSaveKey);
        });
        // For text and number inputs, also save on input event for real-time saving
        if (
          input.type !== "radio" &&
          input.type !== "checkbox" &&
          input.tagName !== "SELECT"
        ) {
          input.addEventListener("input", () => {
            api.saveCurrentConfigToLocalStorage(autoSaveKey);
          });
        }
      });
    }

    return api;
  }

  // Return public API
  return {
    inputCreate,
  };
})();

// Export to window for non-module usage
if (typeof window !== "undefined") {
  window.inputCreate = inputCreate;
}
