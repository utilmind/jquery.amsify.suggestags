/**
 * Amsify Suggestags
 * https://github.com/amsify42/jquery.amsify.suggestags
 * http://www.amsify42.com
 */

var AmsifySuggestags;

(function(factory) {
	if ("object" === typeof module && "object" === typeof module.exports) {
		factory(require("jquery"), window, document);
	} else {
		factory(jQuery, window, document);
	}
}
(function($, window, document, undefined) {
	
	AmsifySuggestags = function(selector) {
		this.selector = selector;
		this.settings = {
			type              : "bootstrap",
			tagLimit          : -1,
			suggestions       : [],
			suggestionsAction : {timeout: -1, minChars: 2, minChange: -1, type: "GET"},
			defaultTagClass   : "",
			classes           : [],
			backgrounds       : [],
			colors            : [],
			whiteList         : false,
			afterAdd          : {},
			afterRemove       : {},
			selectOnHover     : true,
			triggerChange     : false,
			noSuggestionMsg   : "",
			showAllSuggestions: false,
			keepLastOnHoverTag: true,
			printValues 	  : true, // set to false to disable debug
			checkSimilar 	  : true,
			delimiters        : []
		};
		this.method        = undefined;
		this.name          = null;
		this.defaultLabel  = "Type here";
		this.classes       = {
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
		this.selectors     = {
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
		this.isRequired = false;
		this.ajaxActive = false; 
		this.tagNames   = [];
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
		        var me = this;

			if (me.checkMethod()) {
				me.name = ($(me.selector).attr("name")) ? $(me.selector).attr("name") + "_amsify" : "amsify_suggestags";
				me.createHTML();
				me.setEvents();
				$(me.selector).hide();
				me.setDefault();
			}
		},

		createHTML : function() {
		        var me = this,
			    HTML                  = '<div class="' + me.classes.sTagsArea.substring(1) + '"></div>';
			me.selectors.sTagsArea  = $(HTML).insertAfter(me.selector);

			var labelHTML             = '<div class="' + me.classes.inputArea.substring(1) + '"></div>';
			me.selectors.inputArea  = $(labelHTML).appendTo(me.selectors.sTagsArea);
			me.defaultLabel         = ($(me.selector).attr("placeholder") !== undefined) ? $(me.selector).attr("placeholder") : me.defaultLabel;

			var sTagsInput            = '<div contenteditable="plaintext-only" type="text" class="'+me.classes.sTagsInput.substring(1)+'" placeholder="'+me.defaultLabel+'">';
			me.selectors.sTagsInput = $(sTagsInput).appendTo(me.selectors.inputArea).attr("autocomplete", "off");
			if ($(me.selector).attr("required")) {
				$(me.selector).removeAttr("required");
				me.isRequired = true;
				me.updateIsRequired();
			}

			var listArea              = '<div class="'+me.classes.listArea.substring(1)+'"></div>';
			me.selectors.listArea   = $(listArea).appendTo(me.selectors.sTagsArea);
			$(me.selectors.listArea).width($(me.selectors.sTagsArea).width() - 3);

			var list                  = '<ul class="'+me.classes.list.substring(1)+'"></ul>';
			me.selectors.list       = $(list).appendTo(me.selectors.listArea);

			me.updateSuggestionList();
			me.fixCSS();
		},

		updateIsRequired : function() {
			if (this.isRequired) {
				if (this.tagNames.length)
					$(this.selectors.sTagsInput).removeAttr("required");
				else
					$(this.selectors.sTagsInput).attr("required", "required");
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
			if (window !== undefined) {
				$(window).resize(function() {
					$(_self.selectors.listArea).width($(_self.selectors.sTagsArea).width() - 3);
				});
			}

			_self.setSuggestionsEvents();
			_self.setRemoveEvent();
		},

		setTagEvents : function() {
			var _self = this,
                            selectors = _self.selectors;

			$(selectors.sTagsInput).focus(function() {
			        var $input = $(this).parent();
//			        $input.html($input.html().substring(5));
//$input.html('<div contenteditable="plaintext-only"' + $input.html().substring(6));
//$input = $input.find("[contenteditable]").focus();

			   /**
				* Show all suggestions if setting set to true
				*/
				if (_self.settings.showAllSuggestions) {
					_self.suggestWhiteList("", 0, 1);
				}
				$input.closest(_self.classes.inputArea).addClass(_self.classes.focus.substring(1));
				if ("materialize" === _self.settings.type) {
					$input.css({
						"border-bottom": "none",
						"-webkit-box-shadow": "none",
						"box-shadow": "none",
					});
				}
			});

			$(selectors.sTagsInput).blur(function() {
				$(this).closest(_self.classes.inputArea).removeClass(_self.classes.focus.substring(1));
				if (!$(this).text()) { // AK: originally used .val() for input field instead of .text().
					$(selectors.listArea).hide();
				}
			});

			$(selectors.sTagsInput).keyup(function(e) {
				var key = e.key;
				if (!key) {
				  if (13 === e.keyCode)
					key = "Enter";
				  else if (188 === e.keyCode)
					key = ",";
                                }

				var isDelimiter = !!(-1 !== $.inArray(key, _self.settings.delimiters));
				if (("Enter" === key)  || ("," === key)  || isDelimiter) {
					var value = $.trim($(this).text().replace(/,/g , "")); // AK: originally was used .val() for input field instead of .text().
					if (isDelimiter) {
						$.each(_self.settings.delimiters, function(dkey, delimiter) {
							value = $.trim(value.replace(delimiter, ""));
						});
					}
					$(this).text(""); // AK: originally was used .val() for input field instead of .text().
					_self.addTag(_self.getValue(value));
					if (_self.settings.showAllSuggestions) {
						_self.suggestWhiteList("", 0, true);
					}
				}else if (8 === e.keyCode && !$(this).text()) { // AK: originally used .val() for input field instead of .text().
					var removeClass = _self.classes.readyToRemove.substring(1);
					if ($(this).hasClass(removeClass)) {
						_self.removeTagByItem($(this).closest(_self.classes.inputArea).find(_self.classes.tagItem + ":last"), false);
					}else {
						$(this).addClass(removeClass);
					}
					$(selectors.listArea).hide();
					if (_self.settings.showAllSuggestions) {
						_self.suggestWhiteList("", 0, true);
					}
				}else if ((_self.settings.suggestions.length || _self.isSuggestAction()) && ($(this).text() || _self.settings.showAllSuggestions)) { // AK: originally used .val() for input field instead of .text().
					$(this).removeClass(_self.classes.readyToRemove.substring(1));
					_self.processWhiteList(e.keyCode, $(this).text()); // AK: originally used .val() for input field instead of .text().
				}
			});

			$(selectors.sTagsInput).keypress(function(e) {
				if (13 === e.keyCode) return false;
			});

			$(selectors.sTagsArea).click(function() {
				$(selectors.sTagsInput).focus();
			});
		},

		setSuggestionsEvents : function() {
			var _self = this;
			if (_self.settings.selectOnHover) {
				$(_self.selectors.listArea).find(this.classes.listItem).hover(function() {
					$(_self.selectors.listArea).find(_self.classes.listItem).removeClass("active");
					$(this).addClass("active");
					$(_self.selectors.sTagsInput).text($(this).text()); // AK: originally used .val() for input field instead of .text().
				}, function() {
					$(this).removeClass("active");
					if (!_self.settings.keepLastOnHoverTag) {
						$(_self.selectors.sTagsInput).text(""); // AK: originally used .val() for input field instead of .text().
					}
				});
			}

			$(_self.selectors.listArea).find(_self.classes.listItem).click(function() {
				_self.addTag($(this).data("val"));
				$(_self.selectors.sTagsInput).text("").focus(); // AK: originally used .val() for input field instead of .text().
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
				    lower = tag.toString().toLowerCase();

				$.each(this.settings.suggestions, function(key, item) {
					if (("object" === typeof item) && item.tag.toString().toLowerCase() === lower) {
						value = item.value;
						return false; // break each()
					}
					else if (item.toString().toLowerCase() === lower) {
						return false; // break each() 
					}
				});
				return value;
			}
			return tag;
		},

		processAjaxSuggestion : function(value, keycode) {
			var _self           = this,
			    actionURL       = this.getActionURL(this.settings.suggestionsAction.url),
			    params          = {existingTags: this.tagNames, existing: this.settings.suggestions, term: value},
			    ajaxConfig      = this.settings.suggestionsAction.callbacks ? this.settings.suggestionsAction.callbacks: {},
			    ajaxFormParams  = {
				url : actionURL,
			    };

			if ("GET" === this.settings.suggestionsAction.type) {
				ajaxFormParams.url = ajaxFormParams.url + "?" + $.param(params);
			}else {
				ajaxFormParams.type = this.settings.suggestionsAction.type;
				ajaxFormParams.data = params;
			}

			if (-1 !== this.settings.suggestionsAction.timeout) {
				ajaxFormParams["timeout"] = this.settings.suggestionsAction.timeout * 1000;
			}

			if (this.settings.suggestionsAction.beforeSend !== undefined && typeof this.settings.suggestionsAction.beforeSend === "function") {
				ajaxFormParams["beforeSend"] = this.settings.suggestionsAction.beforeSend;
			}

			ajaxFormParams["success"] = function(data) {
				if (data && data.suggestions) {
					_self.settings.suggestions = $.merge(_self.settings.suggestions, data.suggestions);
					_self.settings.suggestions = _self.unique(_self.settings.suggestions);
					_self.updateSuggestionList();
					_self.setSuggestionsEvents();
					_self.suggestWhiteList(value, keycode);
				}

				if (_self.settings.suggestionsAction.success !== undefined && typeof _self.settings.suggestionsAction.success === "function") {
					_self.settings.suggestionsAction.success(data);
				}
			};

			if (this.settings.suggestionsAction.error !== undefined && typeof this.settings.suggestionsAction.error === "function") {
				ajaxFormParams["error"] = this.settings.suggestionsAction.error;
			}

			ajaxFormParams["complete"] = function(data) {
				if (_self.settings.suggestionsAction.complete !== undefined && typeof _self.settings.suggestionsAction.complete === "function") {
					_self.settings.suggestionsAction.complete(data);
				}

				_self.ajaxActive = false;
			};

			$.ajax(ajaxFormParams);
		},

		processWhiteList : function(keycode, value) {
			if (40 === keycode || 38 === keycode) {
				var type = (40 === keycode) ? "down" : "up";
				this.upDownSuggestion(value, type);
			}else {
				if (this.isSuggestAction() && !this.ajaxActive) {
					var minChars   = this.settings.suggestionsAction.minChars,
					    minChange  = this.settings.suggestionsAction.minChange,
					    lastSearch = this.selectors.sTagsInput.attr("last-search");

					if ((value.length >= minChars) && (-1 === minChange || !lastSearch || this.similarity(lastSearch, value) * 100 <= minChange)) {
						this.selectors.sTagsInput.attr("last-search", value);
						this.ajaxActive = true;
						this.processAjaxSuggestion(value, keycode);
					}
				}else {
					this.suggestWhiteList(value, keycode);
				}
			}
		},

		upDownSuggestion : function(value, type) {
			var _self     = this,
			    isActive  = 0;

			$(_self.selectors.listArea).find(_self.classes.listItem + ":visible").each(function() {
				if ($(this).hasClass("active")) {
					$(this).removeClass("active");
					var $item = ("up" === type) ?
						        $(this).prevAll(_self.classes.listItem + ":visible:first") :
						        $(this).nextAll(_self.classes.listItem + ":visible:first");

					if ($item.length) {
						isActive = 1;
						$item.addClass("active");
						$(_self.selectors.sTagsInput).text($item.text()); // AK: originally used .val() for input field instead of .text().
					}
					return false;
				}
			});

			if (!isActive) {
				var childItem = ("down" === type) ? "first" : "last",
                                    $item = $(_self.selectors.listArea).find(_self.classes.listItem + ":visible:" + childItem);

				if ($item.length) {
                                  $item.addClass("active");
				  $(_self.selectors.sTagsInput).text($item.text()); // AK: originally used .val() for input field instead of .text().
				}
			}
		},

		suggestWhiteList : function(value, keycode, showAll) {
			var _self = this,
			    found = 0,
			    lower = value.toString().toLowerCase(),
                            $listArea = $(this.selectors.listArea);

			$listArea.find(_self.classes.noSuggestion).hide();

			var $list = $listArea.find(this.classes.list);
			$list.find(this.classes.listItem).each(function() {
				var dataVal = $(this).data("val");

				if ($.isNumeric(dataVal)) {
					dataVal = (-1 === value.toString().indexOf(".")) ? parseInt(dataVal): parseFloat(dataVal);
				}
				if ((!!showAll || ~$(this).text().toString().toLowerCase().indexOf(lower)) && (-1 === $.inArray(dataVal, _self.tagNames))) {
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
				$dataShow = $list.find(this.classes.listItem + "[data-show]");
				if (lower) {
					$dataShow.sort(function(a, b) {
						return value.localeCompare($(a).text().toString());
					}).appendTo($list);
				}else {
					$dataShow.sort(function(a, b) {
						return $(a).text().toString().localeCompare($(b).text().toString());
					}).appendTo($list);
				}
				$dataShow.each(function() {
					$(this).show();
				});

			   /**
				* If only one item left in whitelist suggestions
				*/
				var $item = $listArea.find(this.classes.listItem + ":visible");
				if ((1 === $item.length) && (8 !== keycode)) {
					if ((this.settings.whiteList && this.isSimilarText(value.toLowerCase(), $item.text().toLowerCase(), 40)) || this.isSimilarText(value.toLowerCase(), $item.text().toLowerCase(), 60)) {
						$item.addClass("active");
						$(this.selectors.sTagsInput).text($item.text()); // AK: originally used .val() for input field instead of .text().
					}
				}else {
					$item.removeClass("active");
				}

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
			var _self = this;

			$(_self.selectors.inputArea).find(this.classes.removeTag).click(function(e) {
				e.stopImmediatePropagation();
				$tagItem = $(this).closest(_self.classes.tagItem);
				_self.removeTagByItem($tagItem, false);
			});
		},

		createList : function() {
			var _self     = this,
			    listHTML  = "";

			$.each(this.settings.suggestions, function(index, item) {
				var value = "",
				    tag   = "";

				if ("object" === typeof item) {
					value = item.value;
					tag   = item.tag;
				}else {
					value = item;
					tag   = item;
				}

				listHTML += '<li class="'+_self.classes.listItem.substring(1)+'" data-val="'+value+'">' + tag + '</li>';
			});

			if (_self.settings.noSuggestionMsg)
				listHTML += '<li class="'+_self.classes.noSuggestion.substring(1)+'">' + _self.settings.noSuggestionMsg + '</li>';

			return listHTML;
		},

		addTag : function(value) {
			if (value) {
				var me = this,
                                    $item = $('<span class="' + me.classes.tagItem.substring(1) + '" data-val="' + value + '">' + me.getTag(value) + " " + me.setIcon() + "</span>")
                                                .insertBefore($(me.selectors.sTagsInput));

				if (me.settings.defaultTagClass)
					$item.addClass(me.settings.defaultTagClass);

				if ((-1 !== me.settings.tagLimit) && (0 < me.settings.tagLimit) && (me.tagNames.length >= me.settings.tagLimit)) {
					me.animateRemove($item, true);
					me.flashItem(value);
					return false;
				}

				var itemKey = me.getItemKey(value);
				if (me.settings.whiteList && (-1 === itemKey)) {
					me.animateRemove($item, true);
					me.flashItem(value);
					return false;
				}

				if (me.isPresent(value)) {
					me.animateRemove($item, true);
					me.flashItem(value);
				}else {
					me.customStylings($item, itemKey);
					var dataVal = value;
					if ($.isNumeric(dataVal)) {
						dataVal = (-1 === value.toString().indexOf(".")) ? parseInt(dataVal) : parseFloat(dataVal);
					}
					me.tagNames.push(dataVal);
					me.setRemoveEvent();
					me.setInputValue();
					if (me.settings.afterAdd && ("function" === typeof me.settings.afterAdd)) {
						me.settings.afterAdd(value);
					}
				}
				$(me.selector).trigger("suggestags.add", [value]);
				$(me.selector).trigger("suggestags.change");
				if (me.settings.triggerChange)
					$(me.selector).trigger("change");

				$(me.selectors.listArea).find(me.classes.listItem).removeClass("active");
				$(me.selectors.listArea).hide();
				$(me.selectors.sTagsInput).removeClass(me.classes.readyToRemove.substring(1));
			}
		},

		getItemKey : function(value) {
			var itemKey = -1;

			if (this.settings.suggestions.length) {
				var lower = value.toString().toLowerCase();

				$.each(this.settings.suggestions, function(key, item) {
					if ("object" === typeof item) {
						if (item.value.toString().toLowerCase() === lower) {
							itemKey = key;
							return false; // break each()
						}  
					}else if (item.toString().toLowerCase() === lower) {
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
				if (value.toString().toLowerCase() === tag.toString().toLowerCase()) {
					present = 1;
					return false; // break each()
				}
			});
			return present;
		},

		customStylings : function(item, key) {
			var me = this,
                            settings = me.settings,
			    $item = $(item),
                            isCutom = false;

			if (settings.classes[key]) {
				isCutom = true;
				$item.addClass(settings.classes[key]);
			}
			if (settings.backgrounds[key]) {
				isCutom = true;
				$item.css("background", settings.backgrounds[key]);
			}
			if (settings.colors[key]) {
				isCutom = true;
				$item.css("color", settings.colors[key]);
			}
			if (!isCutom) {
                                $item.addClass(me.classes.colBg.substring(1));
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
			this.tagNames.splice($(item).index(), 1);
			this.animateRemove(item, animate);
			this.setInputValue();

			$(this.selector).trigger("suggestags.remove", [$(item).attr("data-val")]);
			$(this.selector).trigger("suggestags.change");

			if (this.settings.triggerChange)
				$(this.selector).trigger("change");

			if (("function" === this.settings.afterRemove) && typeof this.settings.afterRemove)
				this.settings.afterRemove($(item).attr("data-val"));

			$(this.selectors.sTagsInput).removeClass(this.classes.readyToRemove.substring(1));
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
			var $item = "";

			value = value.toString().toLowerCase();

			$(this.selectors.sTagsArea).find(this.classes.tagItem).each(function() {
				var tagName = $.trim($(this).attr("data-val"));
				if (value == tagName.toString().toLowerCase()) {
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
			var r, removeClass = this.classes.removeTag.substring(1);
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
			if ("amsify" === this.settings.type) {
				$(this.selectors.inputArea).addClass(this.classes.inputAreaDef.substring(1)).css({"padding": "5px 5px"});
			}else if ("materialize" === this.settings.type) {
				$(this.selectors.inputArea).addClass(this.classes.inputAreaDef.substring(1)).css({"height": "auto", "padding": "5px 5px"});
				$(this.selectors.sTagsInput).css({"margin": "0", "height": "auto"});
			}
		},

		printValues : function() {
			console.info(this.tagNames, $(this.selector).val());
		},

		checkMethod : function() {
			var me = this,
                            $selector = $(me.selector),
                            $findTags = $selector.next(this.classes.sTagsArea);

			if ($findTags.length)
				$findTags.remove();

			$selector.show();
			return !(("undefined" !== typeof me.method) && ("destroy" === me.method));
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