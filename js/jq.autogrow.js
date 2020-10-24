/**
 * AutoGrow for <textarea>, jQuery plugin
 * @author Aleksey Kuznietsov aka utilmind
 * @version 1.0
 *
 * @example $("textarea").autoGrow({
 *              animate: {
 *                      enabled: true, // default is false
 *                      duration: "fast", // default: 200
 *                      complete: function() {},       // Default: null
 *                      step:     function(now, fx) {} // Default: null
 *              },
 *              minHeight: "150px", // Default: null (unlimited)
 *              maxHeight: "500px", // --- // ---
 *          });
 *   If "minHeight" / "maxHeight" options is not strictly specified, it takes values from
 *   "data-min-height" and "data-max-height" attributes.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lessier General Public License version 3 as published by
 * the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lessier General Public License for more details.
 *
 * You should have received a copy of the GNU Lessier General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
(function($) {
    var copyDiv = document.createElement("div"),
        $copy = $(copyDiv);

    $copy.css({
      "box-sizing": "border-box",
      "-moz-box-sizing": "border-box",
      "-ms-box-sizing": "border-box",
      "-webkit-box-sizing": "border-box",
      "display": "none",  // originally visibility: hidden.
    });

    document.body.appendChild(copyDiv);

    function autoSize($textarea, options) {
        var textareaWidth = $textarea.width();
        if (0 <= textareaWidth) { // don't do anything if width of textarea is 0 or negative. It's invisible.
              // The copy must have the same properties as an original.
              var text = $textarea.val(),
                  copyProperties = ["fontFamily",
                                    "fontSize",
                                    "fontStyle",
                                    "fontWeight",
                                    "fontVariant",

                                    "lineHeight",
                                    "wordSpacing",
                                    "letterSpacing",
                                    "textTransform",
                                    "textRendering",

                                    "padding",
                                    "paddingLeft",
                                    "paddingRight",
                                    "paddingTop",
                                    "paddingBottom",

                                    "border",
                                    "borderLeft",
                                    "borderRight",
                                    "borderTop",
                                    "borderBottom",
                                    ],

                  textReplacements = [["<",   "&lt;"],
                                      [">",   "&gt;"],
                                      ["!",   "&excl;"],
                                      ["\"",  "&quot;"],
                                      ["$",   "&dollar;"],
                                      ["#",   "&num;"],
                                      ["%",   "&percnt;"],
                                      ["&",   "&amp;"],
                                      ["'",   "&apos;"],
                                      [/\n/g, "<br />"],
                                      ];

              $.each(copyProperties, function(key, val) {
                  $copy.css(val, $textarea.css(val));
              });
              $copy.css("width", $textarea.width()); // CAUTION! TextArea element must be already visible and rendered in order to calculate width correctly.
              $textarea.css("overflow", "hidden");

              // Copy textarea contents; browser will calculate correct height of copy.
              $.each(textReplacements, function(key, val) {
                  text = text.replace(val[0], val[1]);
              });

              $copy.html(text + "<br /><br />");

              // Then, we get the height of the copy and we apply it to the textarea.
              var newHeight = $copy.outerHeight(), // can be $copy.css("height")
                  newHeightI = parseInt(newHeight), // AK: don't use fl0at! It's stand-alone jQuery plugin!
                  maxHeightI = parseInt(options.maxHeight),
                  minHeightI = parseInt(options.minHeight);
              $copy.html(""); // not necessary, since $copy is invisible, but just to keep the DOM clean.

              if (0 !== newHeightI) {
                  if ((!options.maxHeight || (newHeightI < maxHeightI)) &&
                      (!options.minHeight || (newHeightI > minHeightI))) {
                            if (options.animate.enabled) {
                                    options.animate.queue = false;
                                    $textarea.animate({
                                            height: newHeight,
                                    }, options.animate);

                                    newHeight = false; // keep current height
                            }
                            text = "hidden"; // reuse "text" var

                  }else {
                            text = "scroll";
                            if (options.maxHeight && (newHeightI >= maxHeightI)) {
                              newHeight = options.maxHeight;

                            }else if (options.minHeight && (newHeightI <= minHeightI)) {
                              newHeight = options.minHeight;
                              text = "hidden";

                            }else
                              newHeight = false; // keep current height
                  }

                  if (text !== $textarea.css("overflow-y"))
                    $textarea.css("overflow-y", text);
                  if (newHeight)
                    $textarea.css("height", newHeight);
              }
        }
    }

    // CAUTION! TextArea element must be already visible and rendered on first call of autoGrow(), in order to calculate width correctly.
    $.fn.extend({
        autoGrow: function(options) {
                options = $.extend({}, { // defaults
                        animate: {
                            enabled:   false,
                            duration:  200,
                            complete:  null,
                            step:      null,
                        },
                        maxHeight:     null,
                        minHeight:     null,
                    }, options);

                return this.each(function() {
                    var i, $this = $(this),
                        onceToken = "isAuthGrowInited",
                        localOptions = $.extend({}, options);

                    if ((null === localOptions.minHeight) && ($i = $this.data("min-height")))
                      localOptions.minHeight = $i;
                    if ((null === localOptions.maxHeight) && ($i = $this.data("max-height")))
                      localOptions.maxHeight = $i;

                    if (!$this.data(onceToken)) { // first time.
                      $this.data(onceToken, true)
                           .on("change input focus", function() { autoSize($this, localOptions); } ); // once()
                    }

                    // No animations on start
                    autoSize($this, $.extend({}, localOptions, { animate: { enabled: false } }));
                });
        },

        // find all textareas with ".autogrow-500" class inside and make them auto-grow
        autoGrow500: function() {
                return this.each(function() {
                    // autogrow of textareas in cbShown only. We can automatically choose the best height to fit only after everything shown.
                    $(this).find("textarea.autogrow-500").autoGrow({ // don't worry, event handlers inside will be setup only once. This is only animiation and limitation options.
                        animate: {
                            enabled: canAnimate(),
                            duration: "fast",
                        },
                        maxHeight: "500px",
                        // minHeight: derived from "data-min-height" attribute. Eg: data-min-height="150px"
                      });
                });
        },

    });
})(jQuery);