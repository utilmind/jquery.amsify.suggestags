/**
 * Amsify Suggestags
 * https://github.com/amsify42/jquery.amsify.suggestags
 * http://www.amsify42.com
 *
 * Improved in 06.2020 by https://github.com/utilmind
 */

var AmsifySuggestags;

(function(factory) {
	if ("object" === typeof module && "object" === typeof module.exports) {
		factory(require("jquery"), window, document);
	}else {
		factory(jQuery, window, document);
	}
}
(function($, window, document, undefined) {

	AmsifySuggestags = function(selector) {
	        var _self = this;
		_self.selector = selector;
		_self.settings = {
			type              : "bootstrap",
			tagLimit          : -1,
			suggestions       : [],
			suggestionsAction : {timeout: -1, minChars: 2, minChange: -1, type: "GET"},
			minSuggestionWidth: "200px",
			defaultTagClass   : "",
			classes           : [],
			backgrounds       : [],
			colors            : [],
			whiteList         : false,
			prepareTag        : {}, // Prepare to add callback, triggered before adding typed text. Should return modified string for tag.
			afterAdd          : {},
			afterRemove       : {},
			addTagOnBlur      : true,
			selectOnHover     : false, // it's absolutely useless option, which makes me mad if I leave my cursor pointer little bit under the input box and trying to type something.
			selectSimilar     : true,
			triggerChange     : false,
			noSuggestionMsg   : "",
			highlightSuggestion:true,
			showAllSuggestions: false,
			keepLastOnHoverTag: true,
			printValues 	  : false, // AK: originally it was TRUE for debug purposes, but we really don't need it in real projects.
			checkSimilar 	  : true,
			delimiters        : []
		};
		_self.method        = undefined;
		_self.name          = null;
		_self.defaultLabel  = "Type here";
		_self.classes       = {
			sTagsArea     : ".amsify-suggestags-area",
			inputArea     : ".amsify-suggestags-input-area",
			inputAreaDef  : ".amsify-suggestags-input-area-default",
			focus         : ".amsify-focus",
			sTagsInput    : ".amsify-suggestags-input",
			listArea      : ".amsify-suggestags-list",
			list          : ".amsify-list",
			listItem      : ".amsify-list-item",
			itemPad       : ".amsify-item-pad",
			inputType     : ".amsify-select-input",
			tagItem       : ".amsify-select-tag",
			colBg         : ".col-bg",
			removeTag     : ".amsify-remove-tag",
			readyToRemove : ".ready-to-remove",
			noSuggestion  : ".amsify-no-suggestion",
		};
		_self.selectors     = {
			sTagsArea     : null,
			inputArea     : null,
			inputAreaDef  : null,
			sTagsInput    : null,
			listArea      : null,
			list          : null,
			listGroup     : null,
			listItem      : null,
			itemPad       : null,
			inputType     : null,
		};
		_self.isRequired = false;
		_self.ajaxActive = false;
		_self.tagNames   = [];
	};
	AmsifySuggestags.prototype = {
	   /**
		* Merging default settings with custom
		* @type {object}
		*/
		_settings : function(settings) {
			this.settings = $.extend(true, {}, this.settings, settings);
		},

		_setMethod : function(method) {
			this.method = method;
		},

		_init : function() {
		        var _self = this,
                            $selfSelector = $(_self.selector);

			if (_self.checkMethod()) {
				_self.name = $selfSelector.attr("name") ? $selfSelector.attr("name") + "_amsify" : "amsify_suggestags";
				_self.createHTML();
				_self.setEvents();
				$selfSelector.hide();
				_self.setDefault();
			}
		},

		createHTML : function() {
		        var i,
                            _self = this,
                            selfSelector = _self.selector,
                            $selfSelector = $(selfSelector),
                            selfSelectorId = $selfSelector.attr("id");

			_self.selectors.sTagsArea = $('<div class="' + _self.classes.sTagsArea.substr(1) + '"></div>')
                                                         .insertAfter(selfSelector);
			_self.selectors.inputArea = $('<div class="' + _self.classes.inputArea.substr(1) + '"></div>')
                                                         .appendTo(_self.selectors.sTagsArea);

			if (i = $selfSelector.attr("placeholder"))
				_self.defaultLabel = i; // otherwise use default as is
			_self.selectors.sTagsInput = $('<div contenteditable="plaintext-only" class="'+_self.classes.sTagsInput.substr(1)+'" placeholder="'+_self.defaultLabel+'">')
                                                         .appendTo(_self.selectors.inputArea); //.attr("autocomplete", "off");

			if ($selfSelector.attr("required")) {
				$selfSelector.removeAttr("required");
				_self.isRequired = true;
				_self.updateIsRequired();
			}

			_self.selectors.listArea  = $('<div class="'+_self.classes.listArea.substr(1)+'"></div>')
                                                         .appendTo(_self.selectors.sTagsArea)
			                                 .css("min-width", _self.settings.minSuggestionWidth);

			_self.selectors.list      = $('<ul class="'+_self.classes.list.substr(1)+'"></ul>')
                                                         .appendTo(_self.selectors.listArea);

			_self.updateSuggestionList();
			_self.fixCSS();

			// AK 13.06.2020: redirect focus from hidden contol to our new editable div.
                        // (Unfortunately we can't focus setting up new ID and overriding FOR. It won't focus contenteditable <div>, only <input>'s. Explanation at https://stackoverflow.com/questions/54792126/html-label-with-for-div-id-to-focus-a-contenteditable-div-does-label-label
                        // So hooking an event.)
                        if (selfSelectorId) {
                          $('label[for="' + selfSelectorId + '"]').click(function() {
                            // it won't focus immediately after click, so let's focus when this thread is about to finish
                            setTimeout(function() {
                                $(_self.selectors.sTagsInput).focus(); // set input focus
                            }, 0);
                          });
                        }
		},

		updateIsRequired : function() {
		        var attrRequired = "required",
                            _self = this,
		            $input = $(_self.selectors.sTagsInput);

			if (_self.isRequired) {
				if (_self.tagNames.length)
					$input.removeAttr(attrRequired);
				else
					$input.attr(attrRequired, attrRequired);
			}
		},

		updateSuggestionList : function() {
			$(this.selectors.list).html("");
			$(this.createList()).appendTo(this.selectors.list);
		},

		setEvents : function() {
			var _self = this;

			$(_self.selectors.inputArea).attr("style", $(_self.selector).attr("style")).addClass($(_self.selector).attr("class"));

			_self.setTagEvents();
			_self.setSuggestionsEvents();
			_self.setRemoveEvent();
		},

		setTagEvents : function() {
			var _self = this,
                            settings = _self.settings,
                            selectors = _self.selectors,
                            $input = $(selectors.sTagsInput);

                            appendTag = function(_instance, $input, isDelimiter) {
				var value = $.trim($input.text().replace(/,/g , "")); // AK: originally was used .val() for input field instead of .text().
				if (isDelimiter) {
					$.each(_instance.settings.delimiters, function(dkey, delimiter) {
						value = $.trim(value.replace(delimiter, ""));
					});
				}

				$input.text(""); // AK: originally was used .val() for input field instead of .text().
				_instance.addTag(_instance.getValue(value));
				if (_instance.settings.showAllSuggestions) {
					_instance.suggestWhiteList("", 0, 1);
				}
                            };

			$input.focus(function() {
			        var $inputParent = $(this).parent();

			   /**
				* Show all suggestions if setting set to true
				*/
				if (settings.showAllSuggestions) {
					_self.suggestWhiteList("", 0, 1);
				}
				$inputParent.closest(_self.classes.inputArea).addClass(_self.classes.focus.substr(1));
				if ("materialize" === settings.type) {
					$inputParent.css({
						"border-bottom": "none",
						"-webkit-box-shadow": "none",
						"box-shadow": "none",
					});
				}
			});

			$input.blur(function() {
				var $input = $(this); // we already have $input above, but this is for sure that we're in correct instance

				$input.closest(_self.classes.inputArea).removeClass(_self.classes.focus.substr(1));

				if ($input.text()) { // AK: originally used .val() for input field instead of .text().
					if (settings.addTagOnBlur)
						appendTag(_self, $input);
				}else {
					$(selectors.listArea).hide();
				}
			});

			$input.keyup(function(e) {
				var $input = $(this), // we already have $input above, but this is for sure that we're in correct instance
				    inputText = $input.text(),
                                    key = e.key;

                                if (key) {
                                  // AK 14.06.2020: I don't trust to e.key anymore. Sometimes (and totally randomly) it don't recognize non-latin keyboard layout and shows ".", when user typed ",".
                                  // UPD. It trigging keyup twice on cyrrillic layout. 1st key is Shift, 2nd is ".". But shift+"." is "," on cyrillic layout!
                                  // UPD. It's so easy to reproduce. Press shift, immediately unhold it and type ".". Again, Shift, then "." lightning quickly, without holding Shift.
                                  // So let's check last character to know it for sure.
                                  if (("Shift" === key) && ("," === inputText.substr(-1)))
                                    key = ",";

				}else if (13 === e.keyCode)
						key = "Enter";
					else if (188 === e.keyCode)
						key = ",";

				var isDelimiter = (settings.delimiters && (-1 !== $.inArray(key, settings.delimiters)));
				if (("Enter" === key) || ("," === key) || isDelimiter) {
					appendTag(_self, $input, isDelimiter);

				}else if (8 === e.keyCode && !$input.text()) { // AK: originally used .val() for input field instead of .text().
					var removeClass = _self.classes.readyToRemove.substr(1);
					if ($input.hasClass(removeClass)) {
						_self.removeTagByItem($input.closest(_self.classes.inputArea).find(_self.classes.tagItem + ":last"), false);
					}else {
						$input.addClass(removeClass); // so next time last item will be removed on backspace.
					}
					$(selectors.listArea).hide();
					if (settings.showAllSuggestions) {
						_self.suggestWhiteList("", 0, 1);
					}
				}else if ((settings.suggestions.length || _self.isSuggestAction()) && ($input.text() || settings.showAllSuggestions)) { // AK: originally used .val() for input field instead of .text().
					$input.removeClass(_self.classes.readyToRemove.substr(1));
					_self.processWhiteList(e.keyCode, $input.text()); // AK: originally used .val() for input field instead of .text().
				}
			});

			$input.keypress(function(e) {
				if (13 === e.keyCode) return false;
			});

			$(selectors.sTagsArea).click(function() {
			        if (!$input.is(":focus"))
					$input.focus();
			});
		},

		setSuggestionsEvents : function() {
			var _self = this,
                            settings = _self.settings,
                            selectors = _self.selectors;

                        // AK: Of course we always hightlight the item under mouse, but don't always want to replace input text with items content.
			//if (settings.selectOnHover) {
				$(selectors.listArea).find(_self.classes.listItem).hover(function() { // hover in
					$(selectors.listArea).find(_self.classes.listItem).removeClass("active");
					$(this).addClass("active");
					if (settings.selectOnHover) {
						_self.setInputText($(this).text());
					}
				}, function() { // hover out
					$(this).removeClass("active");
					if (settings.selectOnHover && !settings.keepLastOnHoverTag) {
						$(selectors.sTagsInput).text(""); // AK: originally used .val() for input field instead of .text().
					}
				});
			//}

			$(selectors.listArea).find(_self.classes.listItem).mousedown(function(e) {
				e.preventDefault(); // block stealing focus from input (and triggering blur event for input) before we process click event here.

			}).click(function() {
				_self.addTag($(this).data("val"));
				$(selectors.sTagsInput).text("").focus(); // AK: originally used .val() for input field instead of .text().
			});

		},

		isSuggestAction : function() {
			return (this.settings.suggestionsAction && this.settings.suggestionsAction.url);
		},

		getTag : function(value) {
			if (this.settings.suggestions.length) {
				var tag = value;
				$.each(this.settings.suggestions, function(key, item) {
					if (("object" === typeof item) && (item.value === value)) {
						tag = item.tag;
						return false; // break each()

					}else if (item === value) {
						return false; // break each()
					}
				});
				return tag;
			}
			return value;
		},

		getValue : function(tag) {
			if (this.settings.suggestions.length) {
				var value = tag,
				    lower = tag.toLowerCase();

				$.each(this.settings.suggestions, function(key, item) {
					if (("object" === typeof item) && item.tag.toLowerCase() === lower) {
						value = item.value;
						return false; // break each()
					}
					else if (item.toLowerCase() === lower) {
						return false; // break each()
					}
				});
				return value;
			}
			return tag;
		},

		processAjaxSuggestion : function(value, keycode) {
			var _self           = this,
			    actionURL       = _self.getActionURL(_self.settings.suggestionsAction.url),
			    params          = {
                                                 existingTags: _self.tagNames,
                                                 existing: _self.settings.suggestions,
                                                 term: value,
                                              },
			    ajaxConfig      = _self.settings.suggestionsAction.callbacks ? _self.settings.suggestionsAction.callbacks : {},
			    ajaxFormParams  = {
				url : actionURL,
			    };

			if ("GET" === _self.settings.suggestionsAction.type) {
				ajaxFormParams.url = ajaxFormParams.url + "?" + $.param(params);
			}else {
				ajaxFormParams.type = _self.settings.suggestionsAction.type;
				ajaxFormParams.data = params;
			}

			if (-1 !== _self.settings.suggestionsAction.timeout) {
				ajaxFormParams["timeout"] = _self.settings.suggestionsAction.timeout * 1000;
			}

			if (_self.settings.suggestionsAction.beforeSend !== undefined && ("function" === typeof _self.settings.suggestionsAction.beforeSend)) {
				ajaxFormParams["beforeSend"] = _self.settings.suggestionsAction.beforeSend;
			}

			ajaxFormParams["success"] = function(data) {
				if (data && data.suggestions) {
					_self.settings.suggestions = $.merge(_self.settings.suggestions, data.suggestions);
					_self.settings.suggestions = _self.unique(_self.settings.suggestions);
					_self.updateSuggestionList();
					_self.setSuggestionsEvents();
					_self.suggestWhiteList(value, keycode);
				}

				if (_self.settings.suggestionsAction.success !== undefined && ("function" === typeof _self.settings.suggestionsAction.success)) {
					_self.settings.suggestionsAction.success(data);
				}
			};

			if (_self.settings.suggestionsAction.error !== undefined && ("function" === typeof _self.settings.suggestionsAction.error)) {
				ajaxFormParams["error"] = _self.settings.suggestionsAction.error;
			}

			ajaxFormParams["complete"] = function(data) {
				if (_self.settings.suggestionsAction.complete !== undefined && ("function" === typeof _self.settings.suggestionsAction.complete)) {
					_self.settings.suggestionsAction.complete(data);
				}

				_self.ajaxActive = false;
			};

			$.ajax(ajaxFormParams);
		},

		processWhiteList : function(keycode, value) {
		        var _self = this;

			if (40 === keycode || 38 === keycode) {
				var type = (40 === keycode) ? "down" : "up";
				_self.upDownSuggestion(value, type);
			}else {
				if (_self.isSuggestAction() && !_self.ajaxActive) {
					var minChars   = _self.settings.suggestionsAction.minChars,
					    minChange  = _self.settings.suggestionsAction.minChange,
					    lastSearch = _self.selectors.sTagsInput.attr("last-search");

					if ((value.length >= minChars) && (-1 === minChange || !lastSearch || _self.similarity(lastSearch, value) * 100 <= minChange)) {
						_self.selectors.sTagsInput.attr("last-search", value);
						_self.ajaxActive = true;
						_self.processAjaxSuggestion(value, keycode);
					}
				}else {
					_self.suggestWhiteList(value, keycode);
				}
			}
		},

		upDownSuggestion : function(value, type) {
			var _self     = this,
			    isActive  = 0,
                            $input = $(_self.selectors.sTagsInput);

			$(_self.selectors.listArea).find(_self.classes.listItem + ":visible").each(function() {
			        var $item = $(this);
				if ($item.hasClass("active")) {
					$item.removeClass("active");

					// replace $item
					$item = ("up" === type) ?
							$item.prevAll(_self.classes.listItem + ":visible:first") :
							$item.nextAll(_self.classes.listItem + ":visible:first");

					if ($item.length) {
						isActive = 1;
						$item.addClass("active");
                                                _self.setInputText($item.text());
					}
					return false;
				}
			});

			if (!isActive) {
				var childItem = ("down" === type) ? "first" : "last",
                                    $item = $(_self.selectors.listArea).find(_self.classes.listItem + ":visible:" + childItem);

				if ($item.length) {
                                  $item.addClass("active");
				  _self.setInputText($item.text());
				}
			}
		},

		setInputText : function(value) {
			var $input = $(this.selectors.sTagsInput),

			    // this function moves input cursor to the end of editable <div>. For <input>'s we should use different code, see setSelectionRange().
			    cursorToEnd = function() {
		                var textLen = $input.text().length,
                                    input = $input[0],
                                    range = document.createRange(),
                                    sel = window.getSelection();

                                range.setStart(input.childNodes[0], textLen);
                                range.collapse(true);
                                sel.removeAllRanges();
                                sel.addRange(range);
                            };

                        $input.text(value); // AK: originally used .val() for input field instead of .text().
                        cursorToEnd();
		},

		suggestWhiteList : function(value, keycode, showAll) {
			var _self = this,
			    settings = _self.settings,
			    found = 0,
			    lower = value.toLowerCase(),
                            $listArea = $(_self.selectors.listArea),
                            $tagsArea = $(_self.selectors.sTagsArea);

			$listArea.find(_self.classes.noSuggestion).hide();

			var $list = $listArea.find(this.classes.list);
			$list.find(_self.classes.listItem).each(function() {
				var dataVal = $(this).data("val");

				if ($.isNumeric(dataVal)) {
					dataVal = (-1 === value.indexOf(".")) ? parseInt(dataVal) : parseFloat(dataVal);
				}
				if ((!!showAll || ~$(this).text().toLowerCase().indexOf(lower)) && (-1 === $.inArray(dataVal, _self.tagNames))) {
					$(this).attr("data-show", 1);
					found = 1;
				}else {
					$(this).removeAttr("data-show");
				}
				$(this).hide();
			});

			if (found) {
				/**
				 * Sorting the suggestions
				 */
				var $dataShow = $list.find(this.classes.listItem + "[data-show]");

				$dataShow.sort(function(a, b) {
					return $(a).text().localeCompare($(b).text());
				}).appendTo($list);

				if (settings.highlightSuggestion) {
					$list.find(_self.classes.listItem).each(function() {
						var $el = $(this);
						$el.html($el.text().replace(new RegExp("("+value+")", "gi"), "<b>$1</b>"));
					});
				}

				$dataShow.each(function() {
					$(this).show();
				});

			   /**
				* If only one item left in whitelist suggestions
				*/
				var $item = $listArea.find(this.classes.listItem + ":visible");
				if ((1 === $item.length) && (8 !== keycode)) {
					if (settings.selectSimilar &&
                                            ((settings.whiteList && this.isSimilarText(value.toLowerCase(), $item.text().toLowerCase(), 40)) ||
                                             this.isSimilarText(value.toLowerCase(), $item.text().toLowerCase(), 60))) {
						// this will highlight similar text, but not yet choose it.
						$item.addClass("active");
						// now let's replace typed text with similar. (AK: it's wrong, but this is as it was in original code, even without selectSimilar settings, added my me)
						_self.setInputText($item.text());
					}
				}else {
					$item.removeClass("active");
				}

                                var leftPos = $(_self.selectors.sTagsInput).position().left - $tagsArea.position().left;
                                $listArea.css({
                                    left: $tagsArea.position().left + leftPos,
                                    width: $tagsArea.width() - 3 - leftPos,
                                });
				$listArea.show();

			}else {
				if (value && _self.settings.noSuggestionMsg) {
					$listArea.find(_self.classes.listItem).hide();
					$listArea.find(_self.classes.noSuggestion).show();
				}else {
					$listArea.hide();
				}
			}
		},

		setDefault : function() {
			var _self = this,
			    items = $(_self.selector).val().split(",");

			if (items.length) {
				$.each(items, function(index, item) {
					_self.addTag($.trim(item));
				});
			}
		},

		setRemoveEvent: function() {
			var _self = this,
                            $input = $(_self.selectors.sTagsInput),
                            $inputArea = $(_self.selectors.inputArea);

			$inputArea.find(_self.classes.removeTag).click(function(e) {
				e.stopImmediatePropagation();

				var $tagItem = $(this).closest(_self.classes.tagItem);
				_self.removeTagByItem($tagItem, false);

				if (!_self.tagNames.length) {
					var placeholderText = $input.attr("data-placeholder");
	                                if (placeholderText) // return back placeholder message
						$input.attr("placeholder", placeholderText);
				}

				$(_self.selectors.sTagsInput).focus(); // set input focus
			});
		},

		createList : function() {
			var _self     = this,
			    listHTML  = "";

			$.each(_self.settings.suggestions, function(index, item) {
				var value = "",
				    tag   = "";

				if ("object" === typeof item) {
					value = item.value;
					tag   = item.tag;
				}else {
					value = item;
					tag   = item;
				}

				listHTML += '<li class="' + _self.classes.listItem.substr(1) + '" data-val="' + value + '">' + tag + '</li>';
			});

			if (_self.settings.noSuggestionMsg)
				listHTML += '<li class="' + _self.classes.noSuggestion.substr(1) + '">' + _self.settings.noSuggestionMsg + '</li>';

			return listHTML;
		},

		addTag : function(value) {
			if (value) {
				var _self = this,
                                    settings = _self.settings,
                                    $input = $(_self.selectors.sTagsInput),
                                    placeholderText = $input.attr("placeholder");

                                if (placeholderText) { // remove placholder message when at least 1 tag available.
                                  $input.attr("data-placeholder", placeholderText);
                                  $input.removeAttr("placeholder");
                                }

			        if (settings.prepareTag && ("function" === typeof settings.prepareTag))
                                  value = settings.prepareTag(value);

				var $item = $('<span class="' + _self.classes.tagItem.substr(1) + '" data-val="' + value + '">' + _self.getTag(value) + " " + _self.setIcon() + "</span>")
                                                .insertBefore($input);

				if (settings.defaultTagClass)
					$item.addClass(settings.defaultTagClass);

				if ((-1 !== settings.tagLimit) && (0 < settings.tagLimit) && (_self.tagNames.length >= settings.tagLimit)) {
					_self.animateRemove($item, true);
					_self.flashItem(value);
					return false;
				}

				var itemKey = _self.getItemKey(value);
				if (settings.whiteList && (-1 === itemKey)) {
					_self.animateRemove($item, true);
					_self.flashItem(value);
					return false;
				}

				if (_self.isPresent(value)) {
					_self.animateRemove($item, true);
					_self.flashItem(value);
				}else {
					_self.customStylings($item, itemKey);
					var dataVal = value;
					if ($.isNumeric(dataVal)) {
						dataVal = (-1 === value.indexOf(".")) ? parseInt(dataVal) : parseFloat(dataVal);
					}
					_self.tagNames.push(dataVal);
					_self.setRemoveEvent();
					_self.setInputValue();
					if (settings.afterAdd && ("function" === typeof settings.afterAdd)) {
						settings.afterAdd(value);
					}
				}
				$(_self.selector).trigger("suggestags.add", [value]);
				$(_self.selector).trigger("suggestags.change");
				if (settings.triggerChange)
					$(_self.selector).trigger("change");

				$(_self.selectors.listArea).find(_self.classes.listItem).removeClass("active");
				$(_self.selectors.listArea).hide();
				$input.removeClass(_self.classes.readyToRemove.substr(1));
			}
		},

		getItemKey : function(value) {
			var itemKey = -1;

			if (this.settings.suggestions.length) {
				var lower = value.toLowerCase();

				$.each(this.settings.suggestions, function(key, item) {
					if ("object" === typeof item) {
						if (item.value.toLowerCase() === lower) {
							itemKey = key;
							return false; // break each()
						}
					}else if (item.toLowerCase() === lower) {
						itemKey = key;
						return false; // break each()
					}
				});
			}
			return itemKey;
		},

		isPresent : function(value) {
			var present = 0;

			$.each(this.tagNames, function(index, tag) {
				if (value.toLowerCase() === tag.toLowerCase()) {
					present = 1;
					return false; // break each()
				}
			});
			return present;
		},

		customStylings : function(item, key) {
			var _self = this,
                            settings = _self.settings,
			    $item = $(item),
                            isCustom = false;

			if (settings.classes[key]) {
				isCustom = true;
				$item.addClass(settings.classes[key]);
			}
			if (settings.backgrounds[key]) {
				isCustom = true;
				$item.css("background", settings.backgrounds[key]);
			}
			if (settings.colors[key]) {
				isCustom = true;
				$item.css("color", settings.colors[key]);
			}
			if (!isCustom) {
                                $item.addClass(_self.classes.colBg.substr(1));
		        }
		},

		removeTag: function(value) {
			var _self = this,
                            $findTags = $(_self.selectors.sTagsArea).find('[data-val="'+value+'"]');

			if ($findTags.length) {
				$findTags.each(function() {
					_self.removeTagByItem(this, 1);
				});
			}
		},

		removeTagByItem : function(item, animate) {
		        var _self = this;

			_self.tagNames.splice($(item).index(), 1);
			_self.animateRemove(item, animate);
			_self.setInputValue();

			$(_self.selector).trigger("suggestags.remove", [$(item).attr("data-val")]);
			$(_self.selector).trigger("suggestags.change");

			if (_self.settings.triggerChange)
				$(_self.selector).trigger("change");

			if (("function" === _self.settings.afterRemove) && typeof _self.settings.afterRemove)
				_self.settings.afterRemove($(item).attr("data-val"));

			$(_self.selectors.sTagsInput).removeClass(_self.classes.readyToRemove.substr(1));
		},

		animateRemove : function(item, animate) {
			$(item).addClass("disabled");
			if (animate) {
				setTimeout(function() {
					$(item).slideUp();
					setTimeout(function() {
						$(item).remove();
					}, 500);
				}, 500);
			}else {
				$(item).remove();
			}
		},

		flashItem : function(value) {
			var $item = false;

			value = value.toLowerCase();

			$(this.selectors.sTagsArea).find(this.classes.tagItem).each(function() {
				var tagName = $.trim($(this).attr("data-val"));
				if (value == tagName.toLowerCase()) {
					$item = $(this);
					return false; // break each()
				}
			});

			if ($item) {
				$item.addClass("flash");
				setTimeout(function() {
					$item.removeClass("flash");
				}, 1500);
			}
		},

		setIcon : function() {
			var r, removeClass = this.classes.removeTag.substr(1);
			if ("bootstrap" === this.settings.type)
				r = '<span class="fa fa-times ' + removeClass + '"></span>';
			else if ("materialize" === this.settings.type)
				r = '<i class="material-icons right ' + removeClass + '">clear</i>';
			else
				r = '<b class="' + removeClass + '">&times;</b>';
                        return r;
		},

		setInputValue: function() {
			this.updateIsRequired();
			$(this.selector).val(this.tagNames.join(","));

			if (this.settings.printValues)
				this.printValues();
		},

		fixCSS : function() {
		        var _self = this,
                            selectors = _self.selectors;

			if ("amsify" === _self.settings.type) {
				$(selectors.inputArea).addClass(_self.classes.inputAreaDef.substr(1)).css({padding: "5px 5px 3px" }); // -2px due to +2px
			}else if ("materialize" === _self.settings.type) {
				$(selectors.inputArea).addClass(_self.classes.inputAreaDef.substr(1)).css({height: "auto", padding: "5px"});
				$(selectors.sTagsInput).css({margin: 0, height: "auto"});
			}
		},

		printValues : function() {
			console.info(this.tagNames, $(this.selector).val());
		},

		checkMethod : function() {
			var _self = this,
                            $selector = $(_self.selector),
                            $findTags = $selector.next(_self.classes.sTagsArea);

			if ($findTags.length)
				$findTags.remove();

			$selector.show();
			return !(("undefined" !== typeof _self.method) && ("destroy" === _self.method));
		},

		refresh : function() {
			this._setMethod("refresh");
			this._init();
		},

		destroy : function() {
			this._setMethod("destroy");
			this._init();
		},

		getActionURL : function(urlString) {
			var URL = "";

			if (window !== undefined)
				URL = window.location.protocol + "//" + window.location.host;

			if (this.isAbsoluteURL(urlString))
				URL = urlString;
			else
				URL += "/" + urlString.replace(/^\/|\/$/g, "");

			return URL;
		},

		isAbsoluteURL : function(urlString) {
			return !!(new RegExp("^(?:[a-z]+:)?//", "i")).test(urlString);
		},

		unique: function(list) {
			var result = [];
			var _self  = this;
			$.each(list, function(i, e) {
				if ("object" === typeof e) {
					if (!_self.objectInArray(e, result)) {
						result.push(e);
					}
				}else {
					if (-1 === $.inArray(e, result)) {
						result.push(e);
					}
				}
			});
			return result;
		},

		objectInArray : function(element, result) {
			var present = 0;
			if (result.length) {
				$.each(result, function(i, e) {
					if ("object" === typeof e) {
						if (e.value == element.value)
							present = 1;
					}else {
						if (e == element.value)
							present = 1;
					}
					if (present) return false; // break each()
				});
                        }
			return present;
		},

		isSimilarText: function(str1, str2, perc) {
			return this.settings.checkSimilar ? !!(this.similarity(str1, str2) * 100 >= perc) : false;
		},

		similarity: function(s1, s2) {
			var longer = s1,
			    shorter = s2;

			if (s1.length < s2.length) {
				longer = s2;
				shorter = s1;
			}

			var longerLength = longer.length;
			if (0 === longerLength) {
				return 1.0;
			}
			return (longerLength - this.editDistance(longer, shorter)) / parseFloat(longerLength);
		},

		editDistance: function(s1, s2) {
			s1 = s1.toLowerCase();
			s2 = s2.toLowerCase();

			var i, costs = new Array();
			for (i = 0; i <= s1.length; ++i) {
				var j, lastValue = i;
				for (j = 0; j <= s2.length; ++j) {
					if (0 === i) {
						costs[j] = j;
					}else {
						if (0 < j) {
							var newValue = costs[j-1];
							if (s1.charAt(i-1) != s2.charAt(j-1)) {
								newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
							}
							costs[j-1] = lastValue;
							lastValue  = newValue;
						}
					}
				}

				if (0 < i)
					costs[s2.length] = lastValue;
			}
			return costs[s2.length];
		}
	};

	$.fn.amsifySuggestags = function(options, method) {
		return this.each(function() {
			var amsifySuggestags = new AmsifySuggestags(this);

			amsifySuggestags._settings(options);
			amsifySuggestags._setMethod(method);
			amsifySuggestags._init();
		});
	};
}));
