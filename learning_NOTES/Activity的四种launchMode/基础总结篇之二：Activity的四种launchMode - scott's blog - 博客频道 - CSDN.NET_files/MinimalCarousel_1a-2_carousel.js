/**
 * @fileoverview Provides layout specific functionality for HTML5 layout.
 * This includes layout specific directives, that are responsible for
 * interaction with the user, alignment of the blocks and texts in them.
 * Also includes layout specification and initialization.
 */


/**
 * Utils object with specific functionality for the layout.
 * @return {!Object.<function>} Available functions.
 */
var layoutUtils = (function(ng) {


  var preloader = utils.preloader;
  var module = ng.module('custom', []);
  var loadedRes = {};


  /**
   * Returns preloaded image from the list of preloaded images.
   * @param {string} key Image source URL.
   * @return {string} Returns image source URL if it was preloaded.
   */
  var getRes = function(key) {
    return loadedRes[key];
  };


  /**
   * Checks whether this image has already been loaded.
   * @param {string} url Image source URL.
   * @return {boolean} Whether this image was found in preloaded images list.
   */
  var checkUrl = function(url) {
    return getRes(url) !== undefined;
  };


  /**
   * Carousel iterator.
   * @type {!Object}
   */
  var Iterator = {
    init: function(length, current) {
      this.length = length || 0;
      this.current = current || 0;
      this.wrapped = false;
    },
    increment: function() {
      this.wrapped = false;
      this.dir = 'right';
      if (++this.current >= this.length) {
        this.current = 0;
        this.wrapped = true;
      }
      return this.current;
    },
    decrement: function() {
      this.wrapped = false;
      this.dir = 'left';
      if (--this.current < 0) {
        this.current = this.length - 1;
        this.wrapped = true;
      }
      return this.current;
    }
  };

  window.onAdData = function(data, util) {
    initPreloading(data);
    preloader.addCompletionListener(function() {
      loadedRes = preloader.getLoadedImages();
      utils.onAdData(data, util);
    });
    preloader.start();
  };


  /**
   * Creates the list of the CSS classes to apply to the layout content
   * depending on parameters from DAB.
   * @param {!angular.Scope} scope AngularJS layout $scope.
   * @return {!Object.<string>} All available CSS classes.
   */
  var getClasses = function(scope) {
    var design = scope.design;
    var layout = [design['cornerStyle']];

    if (scope.toBoolean(design['bgGradient'])) {
      layout.push('gradient');
    }
    if (design['bgImageUrl'] &&
        design['bgImageUrl'].toLowerCase() !== 'none' &&
        design['bgImageUrl'].toLowerCase() !== 'blank') {
      layout.push('image');
    }
    return {
      layout: layout.join(' ')
    };
  };


  /**
   * Controller for using data binding in layout.
   * @param {!angular.Scope} $scope AngularJS layout $scope.
   * @param {Object} dynamicData Dynamic data from DAB.
   * @param {!angular.$timeout} $timeout AngularJS timeout to control carousel.
   */
  function LayoutController($scope, dynamicData, $timeout) {
    helpers.LayoutController($scope, dynamicData);

    $scope.classes = getClasses($scope);
    $scope.checkUrl = checkUrl;
    angular.forEach($scope.products, function(product, index) {
      product.index = index;
    });

    var main = document.querySelector('.layout');
    var timeoutId = 0;
    var i;
    var arrowsContainer = document.querySelectorAll('.arrow');

    /**
     * @type {Array.<angular.JQLite>}
     */
    var arrows = [];
    var arrowOver = false;

    for (i = 0; i < 2; i++) {
      arrows.push(ng.element(arrowsContainer[i]));
      arrows[i].bind('mouseover', function() {
        arrowOver = true;
      });
      arrows[i].bind('mouseleave', function() {
        arrowOver = false;
      });
    }


    /**
     * Builds lists of the products to be used in the carousels.
     * @param {number} maxItems Maximum number of items in the list.
     * @param {number} maxLists Maximum number of lists.
     * @return {Array.<Object>} All the products lists available.
     */
    $scope.buildProductLists = function(maxItems, maxLists) {
      var res = [];
      var products = $scope.products;
      var chunk = maxItems || 4;
      var max = maxLists || 10;
      for (var i = 0, j = 0; i < products.length && j++ < max; i += chunk) {
        var list = products.slice(i, i + chunk);
        list = list.concat(products.slice(0, chunk - list.length));
        res.push(list);
      }
      // Do not create duplicates when products number is less
      // then maximum visible elements.

      if (products.length < maxItems) {
        res = [];
        res.push(products);
      }
      return res;
    };


    /**
     * Hides navigation arrows on timer.
     */
    var timerFunction = function() {
      if (!arrowOver) {
        $scope.showArrows(false);
      }
      $timeout.cancel(timeoutId);
      timeoutId = 0;
    };

    main.addEventListener('mousemove', function(e) {
      if (!timeoutId) {
        $scope.showArrows(true);
      }
      $timeout.cancel(timeoutId);
      timeoutId = $timeout(timerFunction, 2000);
    });


    /**
     * Shows and hides navigation arrows.
     * @param {boolean} show Whether the navigation arrows should be visible.
     */
    $scope.showArrows = function(show) {
      for (i = 0; i < 2; i++) {
        if (show) {
          arrows[i].removeClass('invisible');
        } else {
          arrows[i].addClass('invisible');
        }
      }
    };
  }


  /**
   * Exposes carousel as a custom attribute. Draws navigation arrows.
   * @param {!angular.$timeout} $timeout The Angular timeput service.
   * @return {angular.Directive} Directive definition object.
   */
  module.directive('arrow', function($timeout) {
    return {
      restrict: 'A',
      link: function(scope, el) {
        $timeout(function() {
          var canvas = document.createElement('canvas');
          canvas.width = 15;
          canvas.height = 21;
          canvas.style.position = 'absolute';
          var context = canvas.getContext('2d');
          context.moveTo(0, 4);
          context.lineTo(3, 4);
          context.lineTo(3, 0);
          context.lineTo(14, 10);
          context.lineTo(3, 21);
          context.lineTo(3, 21);
          context.lineTo(3, 17);
          context.lineTo(0, 17);
          context.lineTo(0, 4);
          var grd = context.createLinearGradient(0, 0, 0, canvas.height);

          if (scope.toBoolean(scope.design['bgGradient'])) {
            grd.addColorStop(0, scope.design['btnColor'].toColor());
            grd.addColorStop(1,
                scope.design['btnColor'].changeBrightness(-0.4));
            context.fillStyle = grd;
          } else {
            context.fillStyle = scope.design['btnColor'].toColor();
          }

          context.fill();

          el[0].appendChild(canvas);
          canvas.style.left = '{0}px'.format((el[0].offsetWidth -
              canvas.width) / 2);
          canvas.style.top = '{0}px'.format((el[0].offsetHeight -
              canvas.height) / 2);

          el.bind('mouseover', function() {
            context.fillStyle = scope.design['btnRollColor'].toColor();
            context.fill();
          });

          el.bind('mouseleave', function() {
            context.fillStyle = scope.design['btnColor'].toColor();
            context.fill();
          });

          el.bind('click', function(e) {
            if (el.hasClass('left')) {
              scope.$emit('carousel_previous_item');
            }
            if (el.hasClass('right')) {
              scope.$emit('carousel_next_item');
            }
            e.preventDefault();
            e.stopImmediatePropagation();
          });
        });
      }
    };
  });


  /**
   * Exposes carousel as a custom attribute. Implements carousel main
   * functionality.
   * @param {!angular.$timeout} $timeout The Angular timeput service.
   * @return {angular.Directive} Directive definition object.
   */
  module.directive('carousel', function($timeout) {
    return {
      restrict: 'A',
      link: function(scope, el, attrs) {
        $timeout(function() {
          var element = el[0];
          var timeoutId;
          var vertical = attrs.vertical;
          var iterator = Object.create(Iterator);
          var listWidth = helpers.getNumericProperty(el[0], 'width');
          var listHeight = helpers.getNumericProperty(el[0], 'height');
          var listWBorderWidth = listWidth + 2;
          var listWBorderHeight = listHeight + 2;
          var carousel = ng.element(element.querySelector('.carousel'));
          var count = scope.$eval(element.attributes.total.value);
          var time = attrs.timer && attrs.timer.toNumber();
          var duration = attrs.duration && attrs.duration.toNumber();
          var visibleItems;
          var shiftItems = visibleItems = Math.min(scope.maxItems,
              scope.products.length);

          if (vertical) {
            carousel.css('width', '{0}px'.format(listWBorderWidth));
          }

          // Convert NodeList to Array. Products array is used to track current
          // visible elements.
          var products = [].slice.call(element.querySelectorAll('.product'));
          // Set up variables according to layout type and remove unnecessary
          // animation elements (that are used for smooth animation) from array.

          products = products.slice(visibleItems, (count + 1) *
              visibleItems);

          for (var i = 0; i < products.length; i++) {
            products[i] = ng.element(products[i]);
          }

          for (i = 0; i < visibleItems; i++) {
            products[i].addClass('visible');
          }

          /**
           * Sets active slide.
           * @param {number} index Current slide index.
           */
          var setActive = function(index) {
            scope.$emit('active:change', index);
            if (iterator.wrapped) {
              var i;
              carousel.removeClass('transition');
              if (iterator.dir === 'left') {
                i = iterator.length + 1;
              }
              if (iterator.dir === 'right') {
                i = 0;
              }
              if (vertical) {
                carousel.css('top', '-{0}px'.format(i * listHeight));
              } else {
                carousel.css('left', '-{0}px'.format(i * listWidth));
              }

            }

            for (i = 0; i < products.length; i++) {
              products[i].removeClass('visible');
            }
            for (i = 0; i < visibleItems; i++) {
              products[i].addClass('visible');
            }

            $timeout(function() {
              move(index);
            }, iterator.wrapped ? 50 : 0);

            iterator.current = index;
          };


          /**
           * Moves slides of the carousel.
           * @param {number} index Current slide index.
           */
          var move = function(index) {
            if (multiMode) {
              carousel.addClass('transition fast');
            }
            $timeout(function() {
              if (vertical) {
                carousel.css('top', '-{0}px'.format((index) *
                    listHeight + listHeight));
              } else {
                carousel.css('left', '-{0}px'.format((index) *
                    listWidth + listWidth));
              }
            }, 50);
          };


          /**
           * Timer initialization for carousel auto rotation.
           */
          var initTimer = function() {
            onTimeout();
            if (duration) {
              $timeout(function() {
                onCancel();
              }, duration);
            }
          };


          /**
           * Updates carousel.
           * @param {number} index Current slide index.
           */
          var update = function(index) {
            setActive(index);
          };


          /**
           * Triggered on next navigation arrow click.
           */
          var onNext = function() {
            for (var i = 0; i < shiftItems; i++) {
              products.push(products.shift());
            }
            iterator.increment();
            setActive(iterator.current);
          };


          /**
           * Triggered on previous navigation arrow click.
           */
          var onPrev = function() {
            for (var i = 0; i < shiftItems; i++) {
              products.unshift(products.pop());
            }
            iterator.decrement();
            setActive(iterator.current);
          };


          /**
           * Triggers update for the carousel, and re-initializes carousel
           * auto rotation.
           */
          var onTimeout = function() {
            timeoutId = $timeout(function() {
              onNext();
              onTimeout();
            }, time);
          };


          /**
           * Stops carousel auto rotation.
           */
          var onCancel = function() {
            $timeout.cancel(timeoutId);
          };


          var multiMode = count > 1;

          /**
           * Initialize the iterator for automated rotation of the carousel.
           */
          iterator.init(count);
          $timeout(function() {
            var items = ng.element(element.querySelectorAll('.carousel-item'));
            if (!vertical) {
              carousel.css('width', '{0}px'.format(listWBorderWidth *
                  (count + 2)));
              items.css('width', '{0}px'.format(listWidth));
            } else {
              carousel.css('height', '{0}px'.format(listWBorderHeight *
                  (count + 2)));
              items.css('height', '{0}px'.format(listHeight));
            }
            update(0);
          });

          if (multiMode) {
            initTimer();
            scope.$on('carousel_next_item', onNext);
            scope.$on('carousel_previous_item', onPrev);
            el.bind('mouseenter $destroy', onCancel);
          } else {
            el.parent().addClass('single-mode');
          }
        });
      }
    };
  });

  ng.module('layout', ['utils', module.name]);

  return {
    LayoutController: LayoutController
  };
})(angular);


/**
 * Layout specification.
 */
(function() {
  // Retail vertical
  // meta
  utils.defineMeta('layoutName', 'MinimalCarousel_1b-2');
  utils.defineMeta('version', '2.0');

  // attributes
  // required
  utils.defineAttribute('Headline', 'productClickOnly', true);

  // optional
  utils.defineAttribute('Product', 'imageUrl', false);
  utils.defineAttribute('Product', 'url', false);
  utils.defineAttribute('Design', 'logoImageUrl', false);
  utils.defineAttribute('Design', 'logoPadding', false);
  utils.defineAttribute('Design', 'bgImageUrl', false);
  utils.defineAttribute('Design', 'bgAlpha', false);
  utils.defineAttribute('Design', 'bgColor', false);
  utils.defineAttribute('Design', 'bgGradient', false);
  utils.defineAttribute('Design', 'borderColor', false);
  utils.defineAttribute('Design', 'cornerStyle', false);
  utils.defineAttribute('Design', 'btnColor', false);
  utils.defineAttribute('Design', 'btnRollColor', false);
  utils.defineAttribute('Design', 'glowColor', false);
  utils.defineAttribute('Design', 'fontUrl', false);

  // occurrences
  utils.defineOccurrences('Headline', 1, 1);
  utils.defineOccurrences('Design', 1, 1);
  utils.defineOccurrences('Product', 4, 4);

  window.setup = function() {
    document.getElementById('ad-container').addEventListener('click',
        utils.clickHandler, false);
  };

  window.initPreloading = function(dynamicData) {
    var data = dynamicData.google_template_data.adData[0];
    var design = utils.parse(data, 'Design')[0];
    var products = utils.parse(data, 'Product');
    var preloader = utils.preloader;
    preloader.addImage(design.logoImageUrl);
    preloader.addImage(design.bgImageUrl);
    for (var i = 0; i < products.length; i++) {
      preloader.addImage(products[i].imageUrl);
    }
  };
})();
