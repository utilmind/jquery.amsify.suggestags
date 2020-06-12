/**
 * Amsify Jquery Select 1.1
 * https://github.com/amsify42/jquery.amsify.suggestags
 * http://www.amsify42.com
 */
(function($) {

    $.fn.amsifySuggestags = function(options, method) {
        /**
         * Merging default settings with custom
         * @type {object}
         */
        var settings = $.extend({
            type          : "bootstrap",
            tagLimit      : -1,
            suggestions   : [],
            classes       : [],
            backgrounds   : [],
            colors        : [],
            whiteList     : false,
            afterAdd      : {},
            afterRemove   : {},
        }, options);

        /**
         * Initialization begins from here
         * @type {Object}
         */
        var AmsifySuggestags = function() {
            this.selector      = null;
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
           this.tagNames = [];
        };

        AmsifySuggestags.prototype = {
            /**
             * Executing all the required settings
             * @param  {selector} form
             */
            _init : function(selector) {
                var me = this;
                if (me.refresh(selector, method)) {
                  me.selector = selector;
                  me.name     = ($(selector).attr("name")) ? $(selector).attr("name") + "_amsify": "amsify_suggestags";
                  me.createHTML();
                  me.setEvents();
                  $(me.selector).hide();
                  me.setDefault();
                }
            },

            createHTML : function() {
              var HTML                  = '<div class="' + this.classes.sTagsArea.substring(1) + '"></div>';
              this.selectors.sTagsArea  = $(HTML).insertAfter(this.selector);
              var labelHTML             = '<div class="' + this.classes.inputArea.substring(1) + '"></div>';
              this.selectors.inputArea  = $(labelHTML).appendTo(this.selectors.sTagsArea);

              this.defaultLabel         = ($(this.selector).attr('placeholder') !== undefined) ? $(this.selector).attr("placeholder"): this.defaultLabel;
              var sTagsInput            = '<input type="text" class="'+this.classes.sTagsInput.substring(1)+'" placeholder="'+this.defaultLabel+'">';
              this.selectors.sTagsInput = $(sTagsInput).appendTo(this.selectors.inputArea).attr("autocomplete", "off");

              var listArea              = '<div class="' + this.classes.listArea.substring(1) + '"></div>';
              this.selectors.listArea   = $(listArea).appendTo(this.selectors.sTagsArea);
              $(this.selectors.listArea).width($(this.selectors.sTagsArea).width()-3);

              var list                  = '<ul class="' + this.classes.list.substring(1) + '"></ul>';
              this.selectors.list       = $(list).appendTo(this.selectors.listArea);
              $(this.createList()).appendTo(this.selectors.list);
              this.fixCSS();
            },

            setEvents : function() {
              var _self = this,
                  $selector = $(_self.selector),
                  selectors = _self.selectors,
                  $inputArea = $(selectors.inputArea),
                  $tagsArea = $(selectors.sTagsArea),
                  $tagsInput = $(selectors.sTagsInput),
                  $listArea = $(selectors.listArea);

              $inputArea.attr("style", $selector.attr("style"))
                        .addClass($selector.attr("class"));

              $tagsInput.focus(function() {
                $(this).closest(_self.classes.inputArea).addClass(_self.classes.focus.substring(1));
                if ("materialize" === settings.type) {
                  $(this).css({
                    "border-bottom": "none",
                    "-webkit-box-shadow": "none",
                    "box-shadow": "none",
                  });
                }
              });

              $tagsInput.blur(function() {
                $(this).closest(_self.classes.inputArea).removeClass(_self.classes.focus.substring(1));
              });

              $tagsInput.keyup(function(e) {
                if (13 === e.keyCode || "," === e.key) {
                   var value = $.trim($(this).val().replace(/,/g , ""));
                   $(this).val("");
                  _self.addTag(value);

                }else if (8 === e.keyCode && !$(this).val()) {
                  var removeClass = _self.classes.readyToRemove.substring(1);
                  if ($(this).hasClass(removeClass)) {
                    $item = $(this).closest(_self.classes.inputArea).find(_self.classes.tagItem + ":last");
                    _self.removeTag($item, false);
                    $(this).removeClass(removeClass);
                  }else {
                    $(this).addClass(removeClass);
                  }

                }else if (settings.suggestions.length && $(this).val()) {
                  $(this).removeClass(_self.classes.readyToRemove.substring(1));
                  _self.processWhiteList(e.keyCode, $(this).val());
                }
              });

              $(window).resize(function() {
                $listArea.width($tagsArea.width()-3);
              });

              $tagsArea.click(function() {
                $tagsInput.focus();
              });

              $listArea.find(_self.classes.listItem).hover(function() {
                $listArea.find(_self.classes.listItem).removeClass("active");
                $(this).addClass("active");
                $tagsInput.val($(this).data("val"));
              }, function() {
                 $(this).removeClass("active");
              });

              $listArea.find(_self.classes.listItem).click(function() {
                 _self.addTag($(this).data("val"));
                 $tagsInput.val("").focus();
              });

              _self.setRemoveEvent();
            },

            processWhiteList : function(keyCode, value) {
              if (40 === keyCode || 38 === keyCode)
                this.upDownSuggestion(value, (40 === keyCode) ? "down": "up");
              else
                this.suggestWhiteList(value);
            },

            upDownSuggestion : function(value, type) {
              var me = this,
                  isActive = 0;

              $(me.selectors.listArea).find(me.classes.listItem + ":visible").each(function() {
                   var $item = $(this);

                   if ($item.hasClass("active")) {
                     $item.removeClass("active");

                     $item = ("up" === type) ?
                               $item.prevAll(me.classes.listItem + ":visible:first") :
                               $item.nextAll(me.classes.listItem + ":visible:first");

                     if ($item.length) {
                       isActive = 1;
                       $item.addClass("active");
                       $(me.selectors.sTagsInput).val($item.data("val"));
                     }

                     return false; // break each()
                   }
              });

              if (!isActive) {
                var childItem = ("down" === type) ? "first": "last",
                    $item = $(me.selectors.listArea).find(me.classes.listItem + ':visible:' + childItem);

                if ($item.length) {
                  $item.addClass("active");
                  $(me.selectors.sTagsInput).val($item.data("val"));
                }
              }
            },

            suggestWhiteList : function(value) {
              var me = this,
                  found = 0;

              $(me.selectors.listArea).find(me.classes.listItem).each(function() {
                if (~$(this).attr("data-val").toLowerCase().indexOf(value.toLowerCase()) && (-1 === $.inArray($(this).attr("data-val"), me.tagNames)))
                  found = 1;
                $(this).toggle(found);
                if (found) return false; // break each()
              });

              $(me.selectors.listArea).toggle(found);
            },

            setDefault : function() {
              var me = this,
                  items = $(me.selector).val().split(",");

              if (items.length) {
                $.each(items, function(index, item) {
                  me.addTag($.trim(item));
                });
              }
            },

            setRemoveEvent: function() {
              var me = this;

              $(me.selectors.inputArea).find(me.classes.removeTag).click(function(e) {
                  e.stopImmediatePropagation();
                  me.removeTag($(this).closest(me.classes.tagItem), false);
              });
            },

            createList : function() {
              var me = this,
                  listHTML = "";

              $.each(settings.suggestions, function(index, item) {
                  listHTML+= '<li class="' + me.classes.listItem.substring(1) + '" data-val="' + item + '">' + item + "</li>";
              });

              return listHTML;
            },

            addTag : function(value) {
              if (value) {
                var me = this,
                    $item = $('<span class="' + me.classes.tagItem.substring(1) + '" data-val="' + value + '">' + value + " " + me.setIcon() + "</span>")
                              .insertBefore($(me.selectors.sTagsInput));

                if ((-1 !== settings.tagLimit) && (0 < settings.tagLimit) && (me.tagNames.length >= settings.tagLimit)) {
                  me.animateRemove($item, true);
                  me.flashItem(value);
                  return false;
                }

                var itemKey = $.inArray(value, settings.suggestions);
                if (settings.whiteList && (-1 === itemKey)) {
                  me.animateRemove($item, true);
                  me.flashItem(value);
                  return false;
                }

                if (this.isPresent(value)) {
                  me.animateRemove($item, true);
                  me.flashItem(value);
                }else {
                  me.customStylings($item, itemKey);
                  me.tagNames.push(value);
                  me.setRemoveEvent();
                  me.setInputValue();
                  if (settings.afterAdd && "function" === typeof settings.afterAdd) {
                    settings.afterAdd(value);
                  }
                }

                $(me.selector).trigger("suggestags.add", [value]);
                $(me.selectors.listArea).find(this.classes.listItem).removeClass("active");
                $(me.selectors.listArea).hide();
              }
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
              var isCutom = 0;
              if (settings.classes[key]) {
                isCutom = 1;
                $(item).addClass(settings.classes[key]);
              }
              if (settings.backgrounds[key]) {
                isCutom = 1;
                $(item).css("background", settings.backgrounds[key]);
              }
              if (settings.colors[key]) {
                isCutom = 1;
                $(item).css("color", settings.colors[key]);
              }
              if (!isCutom) $(item).addClass(this.classes.colBg.substring(1));
            },

            removeTag : function(item, animate) {
              var me = this;

              me.tagNames.splice($(item).index(), 1);
              me.animateRemove(item, animate);
              me.setInputValue();
              $(me.selector).trigger("suggestags.remove", [$(item).attr("data-val")]);

              if (settings.afterRemove && "function" === typeof settings.afterRemove)
                settings.afterRemove($(item).attr("data-val"));
            },

            animateRemove : function(item, animate) {
              var $item = $(item);

              $item.addClass("disabled");
              if (animate) {
                setTimeout(function() {
                  $item.slideUp();
                  setTimeout(function() {
                    $item.remove();
                  }, 500);
                }, 500);
              }else {
                $item.remove();
              }
            },

            flashItem : function(value) {
              var $item  = "";

              $(this.selectors.sTagsArea).find(this.classes.tagItem).each(function() {
                var tagName = $.trim($(this).attr("data-val"));
                if(value.toLowerCase() == tagName.toLowerCase()) {
                  $item = $(this);
                  return false;
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

              if ("bootstrap" === settings.type)
                r = '<span class="fa fa-times '+removeClass+'"></span>';
              else if ("materialize" === settings.type)
                r = '<i class="material-icons right '+removeClass+'">clear</i>';
              else
                r = '<b class="'+removeClass+'">&times;</b>';

              return r;
            },

            setInputValue: function() {
              $(this.selector).val(this.tagNames.join(","));
              // console.info(this.tagNames, $(this.selector).val());
            },

            fixCSS : function() {
              var me = this;

              if ("amsify" === settings.type) {
                $(me.selectors.inputArea).addClass(me.classes.inputAreaDef.substring(1)).css({"padding": "5px 5px"});
              }else if ("materialize" === settings.type) {
                $(me.selectors.inputArea).addClass(me.classes.inputAreaDef.substring(1)).css({"height": "auto", "padding": "5px 5px"});
                $(me.selectors.sTagsInput).css({"margin": 0, "height": "auto"});
              }
            },

            refresh : function(selector, method) {
              var $selector = $(selector),
                  $findTags = $selector.next(this.classes.sTagsArea);

              if ($findTags.length)
                $findTags.remove();

              $selector.show();
              return !("undefined" !== typeof method && "destroy" === method);
            },
        };

        /**
         * Initializing each instance of selector
         * @return {object}
         */
        return this.each(function() {
            (new AmsifySuggestags)._init(this);
        });
    };

}(jQuery));