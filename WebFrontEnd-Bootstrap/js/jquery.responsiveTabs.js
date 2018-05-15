
/*
 *  Project: Accordion to tabs
 *  Description: Presente content sections like accordion on smaller devices and like tabs on larger devices
 *  Author: laurentperroteau.com
 *  License: MIT
 */

;(function ( $, window, document, undefined ) {

    // Create the defaults once
    var pluginName = 'accordionToTabs',
        defaults = {
            classMenuSmaller:        '.tab-menu-mobile',
            classMenuHigher:         '.tab-menu',
            classMenuHigherTrigger:  '.tab-menu--trigger',
            classTabsSection:        '.tab-container--section',
            breakpoint:              '600px' // can be px, ems, rems
        };

    // The actual plugin constructor
    function Plugin( element, options ) {
        this.element = element;

        this.options = $.extend( {}, defaults, options) ;

        this._defaults = defaults;
        this._name = pluginName;

        this.init();
    }

    Plugin.prototype = {

        init: function () {
                // Place initialization logic here
                this.activeTab();
        },

        cache: {
            flagTabOpen: false
        },

        activeTab: function(idTabToActivate) {

            var $container = $( this.element );

            // Si une ID est passé, on active la tab correspondante
            if( idTabToActivate !== undefined ) 
            {
                if( matchMedia('only screen and (max-width: '+ this.options.breakpoint +')').matches )
                {
                    this._actionOnClickSmaller( idTabToActivate, $container );
                }
                else {
                    this._actionOnClickHigher( idTabToActivate, $container );
                }
            }
            else {     

                // Activer la première tab si pas mobile
                if( matchMedia('only screen and (min-width: '+ this.options.breakpoint +')').matches )
                {
                    var $parentMenu = $( this.options.classMenuHigher );

                    // Sur le menu
                    for (var i = 0; i < $parentMenu.length; i++) {
                        $parentMenu.eq(i).find( this.options.classMenuHigherTrigger ).first().addClass('is-active');
                    };
                    // Et sur la tab
                    $container.find( this.options.classTabsSection ).first().addClass('is-visible');

                }

                var self = this;

                // Action en mobile
                $container.find( this.options.classMenuSmaller ).on('click', function(e) {
                    e.preventDefault();

                    self._actionOnClickSmaller( $(this), $container );
                });

                // Action en tablet/desktop
                var firstIdTab = $container.find( this.options.classTabsSection ).first().attr('id');

                // A partir de la ID de la première tab, 
                //     on retrouve sont trigger, 
                //     on remonte à son parent
                //     et on ajouter l'event sur tous les liens
                $('a[href=#'+ firstIdTab +']'+ this.options.classMenuHigherTrigger)
                    .closest( this.options.classMenuHigher )
                    .find( this.options.classMenuHigherTrigger )
                    .on('click', function(e) {
                        e.preventDefault();

                        self._actionOnClickHigher( $(this), $container );
                });
            }
        },


        /**
         * Action sur les petits devices
         * ==============================
         * @param  {object/string} $trigger => si utilisation de la méthode activeTab() en déhors du plugin, $trigger est la ID de la tab à ouvrir      
         * @param  {object} $container => les conteneurs des tabs
         */
        _actionOnClickSmaller: function($trigger, $container) {

            var tabId;

            if ( typeof $trigger === 'string' )
            {
                tabId = '#'+ $trigger;
                $trigger = $(this.options.classMenuSmaller +'[href='+ tabId +']');
            }
            else {
                tabId = $trigger.attr('href');
            }

            var $tabToShow = $(tabId);

            if( $tabToShow.length > 1 )
                console.error('Une id est dupliqué');

            // Désactiver tous les menus
            $container.find( this.options.classMenuSmaller ).removeClass('is-active');

            // Si courant ouvert, on ferme tout : sinon on ouvre le courant
            if( $tabToShow.hasClass('is-visible') ) {
                this._closeAllTabs( $tabToShow, $container );
            }
            else {
                $trigger.addClass('is-active');
                // Activer aussi le lien pour higher
                $('a[href='+ tabId +']'+ this.options.classMenuHigherTrigger).addClass('is-active');
                this._switchTabs( $tabToShow, $container );
            }
        },

        /**
         * Action sur les grands devices
         * ==============================
         * @param  {object/string} $trigger => si utilisation de la méthode activeTab() en déhors du plugin, $trigger est la ID de la tab à ouvrir      
         * @param  {object} $container => les conteneurs des tabs
         */
        _actionOnClickHigher: function($trigger, $container) {

            var tabId;

            if ( typeof $trigger === 'string' )
            {
                tabId = '#'+ $trigger;
                $trigger = $(this.options.classMenuHigherTrigger +'[href='+ tabId +']');
            }
            else {
                tabId = $trigger.attr('href');
            }

            var $tabToShow = $(tabId);

            if( $tabToShow.length > 1 )
                console.error('Une id est dupliqué');

            // Activer la tab du menu
            $trigger.closest( this.options.classMenuHigher ).find( this.options.classMenuHigherTrigger ).removeClass('is-active');

            $trigger.addClass('is-active');

            this._switchTabs($tabToShow, $container);
        },

        _closeAllTabs: function($currentTab, $container) {

            if( $container.length) 
                $container.find( this.options.classTabsSection ).removeClass('is-visible');
        },

        _switchTabs: function($tab, $container) {

            this._closeAllTabs($tab, $container);

            $tab.addClass('is-visible');

            // Si petit device on scroll jusqu'à l'élément et ce n'est pas la première action
            if( matchMedia('only screen and (max-width: '+ this.options.breakpoint +')').matches 
                && this.cache.flagTabOpen != false ) 
            {
                // Si la tab active était avant, on scroll
                if( this.cache.flagTabOpen.index() > $tab.index() ) 
                {
                    $.scrollTo( '#'+ $tab.attr('id'), 1000);
                }
                else {
                    // Si la tab active était après, on scroll à celle-ci 
                    //     et le temps qu'elle se ferme et on scroll
                    // $.scrollTo( '#'+ this.cache.flagTabOpen.attr('id'), 1000 );
                    setTimeout(function() {
                        $.scrollTo( '#'+ $tab.attr('id'), 1000 );
                    }, 1000);
                }
            }

            // Garde en mémoire la tab ouverte
            this.cache.flagTabOpen = $tab;
            $("select").select2();
        }
    };

    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations and allowing any
    // public function (ie. a function whose name doesn't start
    // with an underscore) to be called via the jQuery plugin,
    // e.g. $(element).defaultPluginName('functionName', arg1, arg2)
    $.fn[pluginName] = function ( options ) {
        var args = arguments;

        if (options === undefined || typeof options === 'object') {
            return this.each(function () {

                if (!$.data(this, 'plugin_' + pluginName))
                    $.data(this, 'plugin_' + pluginName, new Plugin( this, options ));
            });

        } else if (typeof options === 'string' && options[0] !== '_' && options !== 'init') 
        {
            var returns;

            this.each(function () {
                var instance = $.data(this, 'plugin_' + pluginName);

                if (instance instanceof Plugin && typeof instance[options] === 'function')
                    returns = instance[options].apply( instance, Array.prototype.slice.call( args, 1 ) );

                // Allow instances to be destroyed via the 'destroy' method
                if (options === 'destroy') {
                  $.data(this, 'plugin_' + pluginName, null);
                }
            });

            return returns !== undefined ? returns : this;
        }
    };
}(jQuery, window, document));