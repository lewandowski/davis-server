/**
 * Davis
 * Interact with Dynatrace Platform API via Davis bot
 * Web browser implementation
 * 
 * @author Michael Beemer (Backend)
 * @author Cory Woolf (Frontend)
 * 
 * The MIT License (MIT)
 * Copyright (c) 2016 Dynatrace LLC. All Rights Reserved
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, 
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */ 
 
 
var davis = (function () { 
    
    var view;
    var controller;
    var localResponses;
    var isIE = false;
    
    /**
     * Initializes Davis library
     * 
     * @param {String} interactionLogElemId
     * @param {String} textInputElemId
     * @param {String} muteWrapperElemId
     * @param {String} micIconElemId
     * @param {String} listeningStateElemId
     * @param {String} connectedUrlElemId
     */
    var init = function (interactionLogElemId, textInputElemId, muteWrapperElemId, micIconElemId, listeningStateElemId, connectedUrlElemId, gitElemId) {
        
        // IE CustomEvent polyfill
        // http://stackoverflow.com/questions/14358599/object-doesnt-support-this-action-ie9-with-customevent-initialization
        if (navigator.appName == 'Microsoft Internet Explorer' ||  !!(navigator.userAgent.match(/Trident/) || navigator.userAgent.match(/rv 11/))) {
            
            (function () {
                
                function CustomEvent ( event, params ) {
                  
                    params = params || { bubbles: false, cancelable: false, detail: undefined };
                    var evt = document.createEvent('CustomEvent');
                    evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
                    return evt;
                
                };
        
                CustomEvent.prototype = window.Event.prototype;
                window.CustomEvent = CustomEvent;
              
            })();
            
            isIE = true;
        }
        
        $.getJSON('./js/local-responses.json', function (data){
            localResponses = data;
            $(document).ready(function() {
                view = new davisView(interactionLogElemId, textInputElemId, muteWrapperElemId, micIconElemId, listeningStateElemId, connectedUrlElemId, gitElemId);
                controller = new davisController(); 
                view.init();
                controller.init();
                view.attachEventListeners();
            });
        });
        
    };

    /**
     * View
     * 
     * @param {String} interactionLogElemId
     * @param {String} textInputElemId
     * @param {String} muteWrapperElemId
     * @param {String} micIconElemId
     * @param {String} listeningStateElemId
     * @param {String} connectedUrlElemId
     * 
     * @return {Object} global methods
     */
    var davisView = function (interactionLogElemId, textInputElemId, muteWrapperElemId, micIconElemId, listeningStateElemId, connectedUrlElemId, gitElemId) {
        
        this.interactionLogElemId = interactionLogElemId;
        this.textInputElemId = textInputElemId;
        this.muteWrapperElemId = muteWrapperElemId;
        this.micIconElemId = micIconElemId;
        this.listeningStateElemId = listeningStateElemId;
        this.connectedUrlElemId = connectedUrlElemId;
        this.gitElemId = gitElemId;
        
        var sentences = []; // Array of response sentences to be typed into interaction log
        var textBeingTyped;
        var elementBeingTyped;
        var cards = localStorage.getItem('davis-cards-enabled') || 'true';
        var scrollInterval;
        var inputHistoryIndex = -1;
        
        /**
         * Initializes event listeners
         */
        function attachEventListeners() {
            
    		$('#'+textInputElemId).keypress(function (event) {
                submitTextInput(event.keyCode);
            });
            
    	    $('#'+textInputElemId).click(function () {
                enableChatMode();
            });
    	    
    	    $('#'+textInputElemId).focus(function () {
                enableChatMode();
            });
            
            $('#'+textInputElemId).blur(function () {
                resetPlaceholder();
            });
            
            $('#'+muteWrapperElemId).click(function () {
                controller.toggleMute();
            });
        }
    
        /**
         * Resets textInput's placeholder
         */
        function resetPlaceholder() {
            $('#'+textInputElemId).attr('placeholder', localResponses.placeholders[Math.floor(Math.random() * localResponses.placeholders.length)]);
        }
        
        /**
         * Resets textInput's value
         */
        function resetTextInput() {
            $('#'+textInputElemId).val('');
            inputHistoryIndex = -1;
        }
        
        /**
         * Updates the listening state text
         * 
         * @param {String} state
         */
        function setListeningState(state) {
            if (localResponses.listeningStates[state] !== $('#'+listeningStateElemId).html()) {
                $('#'+listeningStateElemId).html(localResponses.listeningStates[state]);
            }
        };
        
        /**
         * Brightens the body's background-color
         */
        function brightenBackground() {
            $('#interactionLogGradientTop').hide();
            $('body').addClass('micOn');
            $('body').removeClass('micOff');
            $('#background').addClass('micOn');
            $('#background').removeClass('micOff');
        }
        
        /**
         * Dims the body's background-color
         */
        function dimBackground() {
            if ($('body').hasClass('micOn')) {
                $('body').addClass('micOff');
                $('body').removeClass('micOn');
                $('#background').addClass('micOff');
                $('#background').removeClass('micOn');
                $('#interactionLogGradientTop').fadeIn(3000);
            }
        }
        
        /**
         * Enables chat mode (text interaction)
         */
        function enableChatMode() {
            dimBackground();
            controller.enableChatMode();
        }
        
        /**
         * Styles mic icon for on state
         */
        function muteOn() {
            $('#'+micIconElemId).removeClass('muteOff');
        }
        
        /**
         * Styles mic icon for off state
         */
        function muteOff() {
            $('#'+micIconElemId).addClass('muteOff');
        }
        
        /**
         * Removes the top element from interactionLog
         */
        function popTopInteraction() {
            $('#'+interactionLogElemId).find('>:first').remove();
        }
        
        /**
         * Hides mic button
         */
        function noMic() {
            $('#'+muteWrapperElemId).css('visibility', 'hidden');
        }
        
        /**
         * Adds string to interaction log
         * 
         * @param {Object} response
         * @param {Boolean} isDavisSpeaking
         * @param {Boolean} isTypeWriter
         */
        function addToInteractionLog(response, isDavisSpeaking, isTypeWriter) {
            
            if (response.card && cards === 'true') {
                
                addCard(response.card);
                 
            } else if (isTypeWriter) {
                
                typeText(response.text);
                
            } else {
                
                var styleClass = (isDavisSpeaking) ? 'botStyle' : 'userStyle';
                var el = $('<p>' + response.text.trim() + '</p>').css('display', 'none').addClass(styleClass);
                $('#'+interactionLogElemId).append(el);
                el.fadeIn(400);
                
            }
            
            $('#'+interactionLogElemId).scrollTop($('#'+interactionLogElemId).prop('scrollHeight'));
            
        }
        
        /**
         * Constructs and adds card to interactionLog
         * 
         * @param {Object} card
         */
        function addCard(card) {
            
            // Add text
            if (card.text !== undefined && card.text.length > 0) {
                addToInteractionLog({text: reformatLinks(card.text.replace(/\n/g, '<br>'), false)}, true, false);
            }

            // Add attachments
            if (card.attachments !== undefined && card.attachments.length > 0) {
                
                var html = localResponses.card.wrapper;
                var attachments = '';
                
                $.each(card.attachments, function (index, atm) {
                    
                    var attachment = '';
                    
                    // Title
                    if (atm.title !== undefined) {
                        
                        atm.title = atm.title.replace(/\:key\:/g, '🔑');
                        
                        if (atm.title_link !== undefined) {
                            
                            var title = localResponses.card.linkAttachment.replace('{{url}}', atm.title_link);
                            title = title.replace('{{text}}', atm.title);
                            attachment += localResponses.card.title.replace('{{title}}', title);
                            
                        } else {
                            attachment += localResponses.card.title.replace('{{title}}', atm.title);
                        }
                        
                    }
                    
                    // Text
                    if (atm.text !== undefined) {
                        attachment += localResponses.card.text.replace('{{text}}', reformatLinks(atm.text.replace(/\n/g, '<br>'), true));
                    }
                    
                    // Fields
                    if (atm.fields !== undefined) {
                        
                        var fields = '';
                        
                        $.each(atm.fields, function (index, fd) {
                           
                            var field = localResponses.card.field.replace('{{title}}', fd.title);
                            fields += field.replace('{{value}}', fd.value.replace(/\n/g, '<br>'));

                        });
                        
                        attachment += localResponses.card.fields.replace('{{fields}}', fields);

                    }
                    
                    // Image URL
                    if (atm.image_url !== undefined) {
                        var regExp = new RegExp('{{src}}', 'g');
                        attachment += localResponses.card.image_url.replace(regExp, atm.image_url);
                    }
                    
                    // Add attachment elements into wrapper
                    if (attachment.length > 0) {
                        
                        attachment = localResponses.card.attachment.replace('{{attachment}}', attachment);
                        
                        // Bar color
                        if (atm.color === undefined) {
                            atm.color = '#d3d3d3';
                        }
                        attachment = attachment.replace('{{color}}', atm.color);
                        
                        // Thumb URL
                        var thumb_url = '';
                        
                        if (atm.thumb_url !== undefined) {
                            thumb_url = localResponses.card.thumb_url.replace('{{src}}', atm.thumb_url);
                        }
                        attachment = attachment.replace('{{thumb_url}}', thumb_url);
                        
                    }
                    
                    // Pretext
                    if (atm.pretext !== undefined && attachment.length == 0 && index == card.attachments.length - 1) {
                        
                        html = html.replace('{{attachments}}', attachments);
                        $('#'+interactionLogElemId).append(html);
                        $('.card-wrapper').fadeIn(400);
                        
                        if (atm.pretext) {
                            addToInteractionLog({text: atm.pretext.replace(/\n/g, '<br>')}, true, false);
                        }
                        
                    } else if (atm.pretext !== undefined) {
                        
                        attachments += localResponses.card.pretext.replace('{{pretext}}', atm.pretext.replace(/\n/g, '<br>'));
                        attachments += attachment;
                        
                        
                    } else {
                        attachments += attachment;
                    }
                    
                    if (attachment.length > 0 && index == card.attachments.length - 1) {
                        
                        html = html.replace('{{attachments}}', attachments);
                        $('#'+interactionLogElemId).append(html);
                        $('.card-wrapper').fadeIn(400); 
                        
                        if (atm.pretext) {
                            addToInteractionLog({text: atm.pretext.replace(/\n/g, '<br>')}, true, false);
                        }
                        
                    }    
                    
                }); 
                
            }
    
        }
        
        /**
         * Reformats links from Slack syntax to html
         * 
         * @param {String} str
         * @param {Boolean} isAttachment
         */
         function reformatLinks(str, isAttachment) {
             
            if (str.indexOf('<http') > -1) {
                
                var exploded = str.split('<http');

                $.each(exploded, function (index, fragment) {
                    
                    if (fragment.indexOf('|') > -1 && fragment.indexOf('>') > -1) {
                        
                        var link = (isAttachment) ? localResponses.card.linkAttachment : localResponses.card.linkText;
                        var url = fragment.substring(0, fragment.indexOf('>'));
                        var text = url.substring(url.indexOf('|') + 1);
                        url = 'http' + url.substring(0, url.indexOf('|'));
                        link = link.replace('{{text}}', text);
                        link = link.replace('{{url}}', url);
                        exploded[index] = fragment.replace(fragment.substring(0, fragment.indexOf('>') + 1), link);
                        
                    }
                    
                });
                
                str = exploded.join('');
            }
            
            return str;
         }
        
        /**
         * Forwards text to be added to interactionLog using a type-writer animation
         * 
         * @param {String} text
         */
        function typeText(text) {
            
            sentences.push(text);
            var text = sentences[0];
            sentences.splice(0, 1);
        
            textBeingTyped = text;
            elementBeingTyped = $('<p></p>').addClass('botStyle');
        
            $('#'+interactionLogElemId).append(elementBeingTyped);
            
            scrollInterval = setInterval( function () {
                $('#'+interactionLogElemId).scrollTop($('#'+interactionLogElemId).prop('scrollHeight'));
            }, 200);
        
            elementBeingTyped.typed({
                strings: [text],
                typeSpeed: 10,
                startDelay: 600,
                showCursor: false,
                callback: function () {
                    clearInterval(scrollInterval);
                }
            });
            
        }
        
        /**
         * Stops typing animation and displays text being typed
         */
        function stopTypewriter() {
            
           
            if (elementBeingTyped) {
                
                // Stop typing
                elementBeingTyped.data('typed').stop();
                clearInterval(scrollInterval);
                $('#'+interactionLogElemId).scrollTop($('#'+interactionLogElemId).prop('scrollHeight'));
                
                // Display text
                $(elementBeingTyped).css('display', 'none');
                $(elementBeingTyped).html(textBeingTyped);
                $(elementBeingTyped).fadeIn(400);
                
            }
            
        }
        
        /**
         * Submits text from textInput 
         * as a request in interactWithRuxit() when the Enter key is pressed
         * 
         * Used for chat mode
         * 
         * @param {Integer} keyCode
         */
        function submitTextInput(keyCode) {
            
            if (keyCode == 13) {
                
                controller.interactWithRuxit($('#'+textInputElemId).val());
                resetTextInput();
                $('#'+textInputElemId).attr('placeholder', '');
                
            }
            
        }
        
        /**
         * Enable offline mode
         * 
         * @param {Boolean} isEnabled
         */
        function enableOfflineMode(isEnabled) {
            
            $("#"+textInputElemId).prop('disabled', isEnabled);
            (isEnabled) ? $("#"+muteWrapperElemId).hide() : $("#"+muteWrapperElemId).show();
            (isEnabled) ? $("#"+connectedUrlElemId).hide() : $("#"+connectedUrlElemId).show();

        }
        
        /**
         * View's initializer (called via onload) 
         */
        function init() {
            
            resetPlaceholder();
            setListeningState('sleeping');
            
            // Listen for keypress
            // if space-bar and textbox not focused, toggleMute
            $(function() {
                
                $(window).keydown(function(e) {
                    
                    var key = e.which;
                    // Space bar
                    if (key == 32 && !$("#"+textInputElemId).is(":focus")) {
                        controller.toggleMute($('#'+listeningStateElemId).html() === localResponses.listeningStates.listening);
                    // Down arrow
                    } else if (key == 40 && controller.getInputHistory().length > 0) {
                        controller.enableChatMode();
                        if (inputHistoryIndex < controller.getInputHistory().length - 1 && inputHistoryIndex !== -1) {
                            inputHistoryIndex++;
                            $("#"+textInputElemId).val(controller.getInputHistory()[inputHistoryIndex]);
                        } else {
                            inputHistoryIndex = 0;
                            $("#"+textInputElemId).val(controller.getInputHistory()[inputHistoryIndex]);
                        }
                    // Up arrow
                    } else if (key == 38 && controller.getInputHistory().length > 0) {
                        controller.enableChatMode();
                        if (inputHistoryIndex > 0) {
                            inputHistoryIndex--;
                            $("#"+textInputElemId).val(controller.getInputHistory()[inputHistoryIndex]);
                        } else {
                            inputHistoryIndex = controller.getInputHistory().length - 1;
                            $("#"+textInputElemId).val(controller.getInputHistory()[inputHistoryIndex]);
                        }
                    } else if (!$("#"+textInputElemId).is(":focus")) {
                        $("#"+textInputElemId).focus();
                    }
                    
                }); 
                
                $('#'+interactionLogElemId).bind('mousewheel', function(e){
                    clearInterval(scrollInterval);
                });
                
                $('#'+interactionLogElemId).bind('click', function(e){
                    clearInterval(scrollInterval);
                });
                
            });
            
            if (typeof window.chrome != 'object') {
               
               addToInteractionLog({text: localResponses.errors.noBrowserSupport.text}, true, false);
               addToInteractionLog({text: localResponses.errors.chrome.text}, true, false);
               addToInteractionLog({text: localResponses.errors.getChrome.text}, true, false); 
                
            }
        }
          
        // view global methods  
        return {
            
            setListeningState: function (state) {
                setListeningState(state);  
            },
            
            listening: function () {
                brightenBackground();  
                muteOff();
            },
            
            muted: function () {
                dimBackground();
                muteOn();
            },
            
            noMic: function () {
                noMic();
            },
            
            resetPlaceholder: function () {
                resetPlaceholder();
            },
            
            resetTextInput: function () {
                resetTextInput();  
            },
            
            focusTextInput: function() {
                $('#'+textInputElemId).focus();    
            },
            
            addToInteractionLog: function (response, isDavisSpeaking, typeText) {
                addToInteractionLog(response, isDavisSpeaking, typeText);
            },
            
            submitTextInput: function (keyCode) {
                submitTextInput(keyCode);
            },
            
            getTextInputElemId: function () {
                return textInputElemId;
            },
            
            enableChatMode: function () {
               enableChatMode();
            },
            
            setConnectedUrl: function (url) {
                $('#'+connectedUrlElemId).html('<span style="opacity:0.4;">Connected:</span> <a href="' + url + '" target="_blank" class="links">'+url+'</a>');
            },
            
            setGit: function (git) {
                
                var branch = '';
                var updated = '';
                if (git.branch !== 'master') {
                    branch = ' (' + git.branch + ')';
                    updated = ' <br /><span>' + git.lastUpdate + '</span>';
                }
                
                if (git.branch) {
                    $('#'+gitElemId).html('<a href="https://github.com/ruxit/davis-server/releases/tag/' + git.tag + '" target="_blank" class="links">' + git.tag + branch + updated + '</a>');
                }
                
            },
            
            getLocalResponses: function () {
                return localResponses;
            },
            
            attachEventListeners: function () {
                attachEventListeners();
            },
            
            getTextBeingTyped: function () {
                return textBeingTyped;  
            },
            
            stopTypewriter: function () {
                stopTypewriter();
            },
            
            enableOfflineMode: function (isEnabled) {
                enableOfflineMode(isEnabled);
            },
            
            enableCards: function (isEnabled) {
                cards = isEnabled.toString();
                (isEnabled) ? addToInteractionLog({text: 'Cards are now enabled'}, true, false) : addToInteractionLog({text: 'Cards have been disabled'}, true, false);
            },
            
            init: function () {
                init();
            },
            
            showDebugFeatures: function(isVisible) {
                (isVisible) ? $('.hidden-feature').show() : $('.hidden-feature').hide();
            },
            
            clearInteractionLog: function() {
                $('#'+interactionLogElemId).html('');
            }
            
        };
        
    };


    /**
     * Controller
     * 
     * @return {Object} global methods
     */
    var davisController = function () {
    
        var isMuted = true;                       // No STT
        var inactivityTimeout = 1;                // Seconds of silence before Watson STT API stops listening
        var momentsOfSilence = 0;                 // Used for polling number of moments of silence 60 ms apart (avoid cutting off TTS playback) 
        var player = new Audio();                 // Audio element used to play TTS audio
        var playerReady = false;
        var micOn;                                // Mic on sound effect
        var stream;                               // IBM STT stream
        var inputHistory = [];                    // History of user input, use up key to cycle through previous inputs
        var outputQueue = [];                     // Counter for keeping track of queued outputTextAndSpeech() calls
        var timezone;                             // User's timezone
        var userToken;                            // Random token used in place of a user ID to store/retrieve conversations in web version
        var debug = false;                        // Debug mode
        var isSpeaking = false;
        var currentTtsToken;
        
        // IE doesn't support WAV
        if (!isIE) {
            micOn = new Audio('./audio/pop.wav');
        }
        
        // Debug mode
        if (localStorage.getItem('davis-debug-mode')) {
            debug = localStorage.getItem('davis-debug-mode') === 'true';
            console.log('Davis: debug = ' + debug);
            view.showDebugFeatures(debug);
        }
        
        // Input history
        if (debug && localStorage.getItem('davis-input-history')) {
            inputHistory = JSON.parse(localStorage.getItem('davis-input-history')).history;
        }
        
        // Speech-To-Text (STT) & Text-To-Speech (TTS) token objects
        var savedSttTokenObj = {
            'token': '',
            'expiration': new Date()
        };
        var savedTtsTokenObj = {
            'token': '',
            'expiration': new Date()
        };
        
        player.addEventListener('canplaythrough', function() {
            playerReady = true;
        }, false);
        
        
        // Listening state events and handlers
        var listeningState;
        
        var listeningStateEvents = {
            sleeping: new CustomEvent('sleeping'),
            enablingMic: new CustomEvent('enablingMic'),
            listening: new CustomEvent('listening'),
            processing: new CustomEvent('processing'),
            responding: new CustomEvent('responding'),
            chatMode: new CustomEvent('chatMode'),
            offlineMode: new CustomEvent('offlineMode')
        };
        
        var evt = new CustomEvent('change-stance', {bubbles: false});
        
        document.addEventListener('sleeping', function (event) {
            listeningState = 'sleeping';
            view.setListeningState(listeningState);
            view.muted();
            
            if (evt.targetStance != 'dynatrace') {
                evt.targetStance = 'dynatrace';
                document.getElementById('davisContainer').dispatchEvent(evt);
            }
        }, false);
        
        document.addEventListener('enablingMic', function (event) {
            listeningState = 'enablingMic';
            view.setListeningState(listeningState);
        }, false);
        
        document.addEventListener('listening', function (event) {
            listeningState = 'listening';
            view.setListeningState(listeningState);
            view.listening();
            micOn.play();
            evt.targetStance = 'listening';
            document.getElementById('davisContainer').dispatchEvent(evt);
        }, false);
        
        document.addEventListener('processing', function (event) {
            listeningState = 'processing';
            view.setListeningState(listeningState);
            view.resetTextInput();
            evt.targetStance = 'thinking';
            document.getElementById('davisContainer').dispatchEvent(evt);
        }, false);
        
        document.addEventListener('responding', function (event) {
            listeningState = 'responding';
            view.setListeningState(listeningState);
            evt.targetStance = 'answer';
            document.getElementById('davisContainer').dispatchEvent(evt);
        }, false);
        
        document.addEventListener('chatMode', function (event) {
            listeningState = 'chatMode';
            view.setListeningState(listeningState);
            
            if (evt.targetStance != 'dynatrace') {
                evt.targetStance = 'dynatrace';
                document.getElementById('davisContainer').dispatchEvent(evt);
            }
        
            // Stop typewriter and any audio that's playing
            if (playerReady) {
                player.pause();
                player.currentTime = 0;
            }
            
            if (!isMuted && isSpeaking) {
                view.stopTypewriter();
            }
            
            isMuted = true;
            view.muted();
            
            enableListenForKeyword(false);
            
        }, false);
        
        document.addEventListener('offlineMode', function (event) {
            listeningState = 'offlineMode';
            view.setListeningState(listeningState);
        }, false);
        
        // Listen for if offline
        var offlineCheck = function(){
            
            if (Offline.state === 'up') {
                
                Offline.check();
                
                if (listeningState == 'offlineMode') {
                    view.enableOfflineMode(false);
                    document.dispatchEvent(listeningStateEvents.sleeping);
                    listen();
                }
                
            } else {
                
                if (listeningState != 'offlineMode') {
                    document.dispatchEvent(listeningStateEvents.offlineMode);
                }
                
                view.enableOfflineMode(true)
                
            }
            
        }
        setInterval(offlineCheck, 5000);
        
        /**
         * Sends a request to be processed for its intent 
         * in order to interact with the Ruxit API (provides APM metrics)
         * 
         * @param {String} request
         */
        function interactWithRuxit(request) {
            
            if (debug) {
                // Limit to last 50 inputs
                if (inputHistory.length > 50) {
                    inputHistory = inputHistory.slice(1, 49);
                }
                inputHistory.push(request);
                localStorage.setItem('davis-input-history', JSON.stringify({history: inputHistory}));
            }
            
            // Debug mode
            if ((request.indexOf('debug') > -1 && request.indexOf('true') > -1) || (request.indexOf('debug') > -1 && !(request.indexOf('false') > -1))) {
                
                debug = true;
                view.showDebugFeatures(true);
                localStorage.setItem('davis-debug-mode', 'true');
                view.addToInteractionLog({text: 'Debug mode enabled'}, true, false);
                
                // Output missed phrases option flag
                if (request.indexOf(' -m') > -1 && localStorage.getItem('davis-missed-phrases')) {
                    
                    var missedPhrases = JSON.parse(localStorage.getItem('davis-missed-phrases'));
                    var html = "<table class='debug'>";
                    
                    for (var i = 0; i < missedPhrases.phrases.length; i++) {
                        
                        html += "<tr class='debug'><td class='debug'>" + missedPhrases.phrases[i].phrase + "</td>";
                        html += "<td class='debug'>" + missedPhrases.phrases[i].count + "</td></tr>";
        
                    }
                    
                    html += "</table>";
                    view.addToInteractionLog({text: html}, true, false);
                    
                }
                
                // Toggle enable cards
                if (request.indexOf(' -c') > -1 && localStorage.getItem('davis-cards-enabled') === 'true') {
                    localStorage.setItem('davis-cards-enabled', 'false');
                    view.enableCards(false);
                } else if (request.indexOf(' -c') > -1) {
                    localStorage.setItem('davis-cards-enabled', 'true');
                    view.enableCards(true);
                }
                
            } else if (request.indexOf('debug') > -1 && request.indexOf('false') > -1) {
                
                debug = false;
                view.showDebugFeatures(false);
                localStorage.setItem('davis-debug-mode', 'false');
                view.addToInteractionLog({text: 'Debug mode disabled'}, true, false);
                
            } else {
        
                if (request === '') {
                    toggleMute(true);
                    inactivityTimeout = 2;
                } else {
                    inactivityTimeout = 1;
                }
            
                view.muted();
                
                if (listeningState !== 'chatMode') {
                    document.dispatchEvent(listeningStateEvents.processing);
                }
            
                if (request) {
            
                    view.addToInteractionLog({text: request}, false, false);
                
                    var date = new Date();
                
                    var input = {
                        sessionId: 'websession-' + date.getDate() + date.getMonth() + date.getFullYear(),
                        request: request,
                        user: userToken,
                        timezone: timezone
                    };
                
                    var options = {
                        method: 'post',
                        mode: 'cors',
                        body: JSON.stringify(input),
                        credentials: 'same-origin',
                        headers: new Headers({
                            'Content-Type': 'application/json; charset=utf-8'
                        })
                    };
            
                    fetch('/web', options)
                    .then(function (response) {
                        
                        return response.json();
                        
                    }).then(function (data) {
                        
                        if (!data.response.text) {
                            
                            document.dispatchEvent(listeningStateEvents.chatMode);
                            outputTextAndSpeech(view.getLocalResponses().errors.nullResponse, view.getLocalResponses().voices.michael, false);
                            return;
                            
                        } else if (!data.response) {
                            
                            document.dispatchEvent(listeningStateEvents.sleeping);
                            return;
                            
                        }
                
                        if (data.response) {

                            outputTextAndSpeech(data.response, view.getLocalResponses().voices.michael, !data.response.shouldEndSession);
                            
                            // "Show me" hyperlink push functionality
                            if (data.response.hyperlink) {
                                window.open(data.response.hyperlink, '_blank');
                            }
                            
                        } else {
                            document.dispatchEvent(listeningStateEvents.sleeping);
                        }
                        
                    }).catch(function (err) {
                        
                        document.dispatchEvent(listeningStateEvents.chatMode);
                        outputTextAndSpeech(view.getLocalResponses().errors.server, view.getLocalResponses().voices.michael, false);
                        console.log('interactWithRuxit - Error: ' + err);
                        
                    });
                } else {
                    if (listeningState !== 'chatMode') {
                        document.dispatchEvent(listeningStateEvents.sleeping);
                    }
                }
            }
        }
        
        /**
         *  Forwards text to be added to the interaction log and be spoken
         * 
         * @param {Object} response
         * @param {String} voice
         * @param {Boolean} listen
         **/
        function outputTextAndSpeech(response, voice, listen) {
        
            if (listeningState !== 'chatMode') {
                
                if (!isSpeaking) {
                    document.dispatchEvent(listeningStateEvents.responding);
                    speak(response, voice, listen);
                } else {
                    outputQueue.push({response: response, voice: voice, listen: listen});
                }
        
            } else {
                chat(response);
            }
                    
        }
        
        /**
         * Returns a token with no expiration
         * for storing and retrieving conversation history
         * The token is stored client-side in localStorage
         * 
         * @return {String} token 
         */ 
        function getDavisUserToken() {
            
            // Attempt to retrieve token from localStorage
            userToken = localStorage.getItem("davis-user-token");
            
            if (!userToken) {
                
                var options = {
                    method: 'get',
                    credentials: 'same-origin',
                    headers: new Headers({
                        'accept': 'text/plain'
                    })
                };
                
                fetch('/web/token', options)
                .then(function (response) {
                    return response.text();
                }).then(function (resp) {
                    localStorage.setItem("davis-user-token", resp);
                    userToken = resp;
                })
                .catch(function (err) {
                    console.log(err);
                });
                
            }
            
        }
        
        /**
         * Returns url of server connected to Davis instance 
         * 
         * @return {Promise} connected url
         */
        function getConnectedServerUrl() {
            
            var options = {
                method: 'get',
                mode: 'cors',
                credentials: 'same-origin'
            };
            
            return fetch('/web/server', options)
            .then(function (response) {
                return response.text();
            });
            
        }
        
        /**
         * Returns Git info
         * 
         * @return {Promise} info
         */
        function getGit() {
            
            var options = {
                method: 'get',
                mode: 'cors',
                credentials: 'same-origin'
            };
            
            return fetch('/api/v1/git', options)
            .then(function (response) {
                return response.json();
            });
            
        }
        
        /**
         * Returns a token for use with IBM Watson TTS
         * 
         * IBM Watson tokens have a time to live (TTL) of one hour, 
         * so we will refresh the token every 59 minutes to be safe
         * 
         * @return {String} savedTtsTokenObj.token
         */
        function getTtsToken() {
            
            var options = {
                method: 'get',
                mode: 'cors',
                credentials: 'same-origin'
            };
        
            if (savedTtsTokenObj.token != '' && savedTtsTokenObj.expiration > new Date((new Date) * 1 - 1000 * 3500)) {
        
                return savedTtsTokenObj.token;
        
            } else {
                
                return fetch('/api/v1/watson/tts/token', options)
                .then(handleErrors)
                .then(function (response) {
                      
                    // Save new token
                    savedTtsTokenObj.expiration = new Date();
                    savedTtsTokenObj.token = response.text();
                
                    return savedTtsTokenObj.token;

                });
              
            }
            
        }
        
        /**
         * Returns a token for use with IBM Watson TTS
         * 
         * IBM Watson tokens have a time to live (TTL) of one hour, 
         * so we will refresh the token every 59 minutes to be safe
         * 
         * @return {promise} savedSttTokenObj.token 
         */
        function getSttToken() {
            
            return new Promise(function (resolve, reject) {
        
                var options = {
                    method: 'get',
                    mode: 'cors',
                    credentials: 'same-origin'
                };
        
                if (savedSttTokenObj.token != '' && savedSttTokenObj.expiration > new Date((new Date) * 1 - 1000 * 3500)) {
        
                    resolve(savedSttTokenObj.token);
        
                } else {
        
                    fetch('/api/v1/watson/stt/token', options)
                    .then(handleErrors)
                    .then(function (response) {
            
                        // Save new token
                        savedSttTokenObj.expiration = new Date();
                        savedSttTokenObj.token = response.text();
                        
                        // Check if mic is detected by browser API
                        var gum = navigator && navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
                        gum.call(navigator, { audio: true }, function () { resolve(savedSttTokenObj.token); }, function () { noMic(); reject(new Error('No Mic')); });
            
                    })
                    .catch(function (err) {
                        reject(err);
                    });
        
                }
                
            });
            
        }
        
        /**
         * Handles Fetch HTTP errors
         */
        function handleErrors(response) {
            
            // if error, disable voice UI
            if (!response.ok) {
                setTimeout( function () {
                    document.dispatchEvent(listeningStateEvents.chatMode);
                    view.noMic();
                    view.muted();
                    view.focusTextInput();
                    view.clearInteractionLog();
                }, 400);
            }
            
            return response;
            
        }
        
        /**
         * Helps setup an audio capture stream for IBM Watson STT API
         * 
         * Requires a token provided by IBM
         * 
         * @param {String} token
         */
        function createSttStream(token) {
            
            return new Promise(function (resolve, reject) {
        
                stream = WatsonSpeech.SpeechToText.recognizeMicrophone({
                    token: token,
                    keepMic: true,
                    outputElement: '#'+view.getTextInputElemId()
                });
        
                stream.on('error', function (err) {
                    console.log(err);
                    noMic();
                });
        
            });
            
        }
        
        /**
         * Listens to user request or plays response
         * 
         * @param {Boolean} listen - listen to user after playing
         */
        function listenOrSpeak(listen) {
            isSpeaking = false;
            if (listen && outputQueue.length == 0) {
                unmute();
            } else if (outputQueue.length > 0) {
                var output = outputQueue.shift();
                speak(output.text, output.voice, output.listen);
            } else {
                document.dispatchEvent(listeningStateEvents.sleeping);
                enableListenForKeyword(true);
            }
        }
        
        /**
         * Forwards text and a token for use with IBM Watson TTS API
         * 
         * @param {Object} response - text to be spoken and/or displayed
         * @param {String} voice - select voice for TTS
         * @param {Boolean} listen - listen after TTS plays
         */
        function speak(response, voice, listen) {
            
                var watsonText = (response.ssml) ? response.ssml : response.text;
            
                player.onplay = function () {
                    isSpeaking = true;
                    view.addToInteractionLog(response, true, true);
                };
                
                player.onpause = function () {
                    listenOrSpeak(listen);
                };
                
                player.onended = function () {
                    listenOrSpeak(listen);
                };
                
                getTtsToken().then( function (token) {
                    if (token) {
                        WatsonSpeech.TextToSpeech.synthesize({
                            text: watsonText,
                            token: token,
                            voice: voice,
                            element: player
                        });
                    } else {
                        noMic();
                    }
                }).catch(function (err) {
                   console.log(err);
                   noMic();
                });
               
            
        }
        
        /**
         * Add to interaction log in chat mode
         * 
         * @param {Object} response
         */
        function chat(response) {
            view.addToInteractionLog(response, true, false);
        }
        
        /**
         *Enables the mic when done playing TTS audio
         */
        function unmute() {
            
            if (outputQueue.length < 1 && listeningState !== 'chatMode') {
                
                listen();
              
            } else if (listeningState !== 'chatMode') {
                toggleMute(true);
                enableListenForKeyword(true);
            }
            
        }
        
        /**
         * Interacts with the IBM Watson STT API
         * when there's no interaction in progress already
         */
        function listen() {
            if (listeningState !== 'listening') {
                getSttToken()
                .then(function (token) {
                    document.dispatchEvent(listeningStateEvents.listening);
                    createSttStream(token);
                })
                .catch(function (err) { 
                    console.log(err); 
                });
              
            }
            
        }
        
        /**
         * Initializes the annyang STT library for use as a key phrase listener 
         *
         * Note: Requires SpeechRecognition browser API
         */
        function annyangInit() {
            
            if (annyang) {
                
                annyang.setLanguage('en');
                
                annyang.addCallback('result', function (phrases) {
                    
                    var launch = false;
                    
                    $.each(view.getLocalResponses().phrases, function (index, phrase) {
                       if (phrases[0].toLowerCase().trim().indexOf(phrase) > -1) {
                           launch = true;
                       } 
                    });
                    
                    if (launch) {
                        
                        document.dispatchEvent(listeningStateEvents.enablingMic);
                        toggleMute(false);
                        
                    } else if (debug && phrases[0].toLowerCase().trim().split(' ').length < 5) {
                        
                        var missedPhrases = {phrases: []};
                        var missedPhrase = phrases[0].toLowerCase().trim();
                        
                        console.log('Davis: Missed phrase logged');
                        console.log('"'+ missedPhrase +'"');
                        
                        // check if JSON is stored in localStorage
                        if (localStorage.getItem('davis-missed-phrases')) {
                        
                            missedPhrases = JSON.parse(localStorage.getItem('davis-missed-phrases'));
                            
                            // Check if missed phrase is already stored in array [{phrase, count}] within object 
                            // Increment count if already stored, push if not
                            for (var i = 0; i < missedPhrases.phrases.length; i++) {
                               
                                if (missedPhrases.phrases[i].phrase == missedPhrase) {
                                    missedPhrases.phrases[i].count++;
                                    i = -1; // Mark as found
                                    break;
                                }
                                
                            }
                            
                            if (i != -1) {
                                missedPhrases.phrases.push({phrase: missedPhrase, count: 1});
                            }
                            
                        } else {
                            missedPhrases.phrases.push({phrase: missedPhrase, count: 1});
                        }
                        
                        localStorage.setItem('davis-missed-phrases', JSON.stringify(missedPhrases));
                    }
                    
                });
                
                enableListenForKeyword(true);
        
            }
            
        }
        
        /**
         * Enables or disables the annyang STT library (used for listening for key phrases)
         * 
         * Note: Used when toggling between the annyang STT library and IBM Watson STT API
         */
        function enableListenForKeyword(listen) {
            if (annyang) {
                listen ? annyang.start({ 'autoRestart': true, 'continuous': false }) : annyang.abort();
            }
        }
        
        /**
         * Toggles the mic on/off
         * 
         * Note: Unless in chat mode, mic off mode still listens for key phrases with annyang
         * 
         * @param {Boolean} mute
         */
        function toggleMute(mute) {
            
            if (listeningState !== 'chatMode') {
                document.dispatchEvent(listeningStateEvents.sleeping);
            }
            
            if (isSpeaking) {
                
                // Stop typewriter and any audio that's playing
                player.pause();
                player.currentTime = 0;
                view.stopTypewriter();
                isMuted = false;
                enableListenForKeyword(false);
                document.dispatchEvent(listeningStateEvents.enablingMic);
                unmute();
                
            } else {
            
                if (!isMuted && mute) {
                    
                    isMuted = true;
                    view.muted();
                    
                    if (stream != null) {
                       stream.stop();
                    }
                    
                    enableListenForKeyword(true);
                    
                } else if (!mute) {
                   
                    isMuted = false;
                    enableListenForKeyword(false);
                    document.dispatchEvent(listeningStateEvents.enablingMic);
                    unmute();
                    
                }
            
            }
            
        }
        
        /**
         * Accounts for cases where no mic browser API is detected (error handeling)
         */
        function noMic() {
            
            document.dispatchEvent(listeningStateEvents.chatMode);
            outputTextAndSpeech(view.getLocalResponses().errors.noMic, view.getLocalResponses().voices.michael, false);
            view.noMic();
            view.muted();
            
        }
        
        /**
         * Controller's initializer (called via onload) 
         */
        function init() {
            
            timezone = jstz.determine().name();
            getDavisUserToken();
            
            getConnectedServerUrl().then( function (url) {
                view.setConnectedUrl(url);
            });
            
            getGit().then( function (git) {
               view.setGit(git);
            });
            
            if (typeof window.chrome != 'object') {
                
                document.dispatchEvent(listeningStateEvents.chatMode);
                view.noMic();
                view.muted();
                
            } else {
        
                // Get tokens and confirm using SSL
                // if failure fallback to chat mode
                getSttToken()
                .then( function (token) {
                    return getTtsToken();
                }).then( function (token) {
                    if (location.protocol === 'https:' || location.href.indexOf('127.0.0.1') > -1 || location.href.indexOf('localhost') > -1) {

                        annyangInit();
                        document.dispatchEvent(listeningStateEvents.sleeping);
                        evt.targetStance = 'dynatrace';
                        document.getElementById('davisContainer').dispatchEvent(evt);
                         
                        if (!localStorage.getItem("davis-user-token")) {
                    
                            view.addToInteractionLog({text: localResponses.greetings.micPermission.text}, true, false);
                            setTimeout(function () {
                                // view.addToInteractionLog({text: localResponses.greetings.thenHelp.text}, true, false);
                            }, 5000);
                            
                        } else {
                            // view.addToInteractionLog({text: localResponses.greetings.help.text}, true, false);
                        }
                        
                    } else {
                        noMic();
                    }
                    
                })
                .catch( function (err) {
                    console.log(err);
                });
                
            }
            
        }
        
        // controller global methods
        return {
            
            getInactivityTimeout: function () {
                return inactivityTimeout;
            },
            enableListenForKeyword: function (listen) {
                enableListenForKeyword(listen);
            },
            enableChatMode: function () {
                document.dispatchEvent(listeningStateEvents.chatMode);
            },
            init: function () {
                init();
            },  
            interactWithRuxit: function (input) {
               interactWithRuxit(input); 
            },
            submitTextInput: function (keycode) {
                submitTextInput(keycode);
            },
            toggleMute: function (mute) {
                toggleMute(mute);    
            },
            process: function () {
                interactWithRuxit($('#'+view.getTextInputElemId()).val());
            },
            getInputHistory: function () {
                return inputHistory;
            }
            
        };
    
    };
    
    // davis global methods
    return {
        
        init: init,
        
        getView: function () {
            return view;
        },
        
        getController: function () {
            return controller;
        }
        
    };
    
})()