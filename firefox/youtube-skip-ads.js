'use strict';

const
    // declare that stuff
    EXTENSION_NAME = `youtube-skip-ads`,
    ELEMENT_NODE = 1,
    // ad manager
    YT_AD_MANAGER_SELECTOR = `#movie_player > div.video-ads.ytp-ad-module`,
    YT_AD_MANAGER_DIV_STYLE = `video-ads ytp-ad-module`,
    // video ad overlay
    YT_VIDEO_AD_OVERLAY_SELECTOR = `#movie_player > div.video-ads.ytp-ad-module > div.ytp-ad-player-overlay`,
    YT_VIDEO_AD_OVERLAY_STYLE = `ytp-ad-player-overlay`,
    // skippable video ad
    YT_VIDEO_AD_SKIPPABLE_STYLE = `ytp-ad-player-overlay-skip-or-preview`,
    // popup ad overlay
    YT_POPUP_AD_OVERLAY_STYLE = `ytp-ad-overlay-slot`,
    // closeable popup ad
    YT_POPUP_AD_CLOSEABLE_STYLE = `ytp-ad-overlay-close-button`,
    // debug flag
    PRINT_DEBUG_MSG = false,
    // create node subtree observer
    createNodeSubtreeObserver = (classMatch, idMatch, tagMatch, executeOnAppend, executeOnRemove, disconnect, resolve, reject) => {
        try {
            const
                // setup observer
                observer = new MutationObserver((ml, obs) => {
                    // loop on observed mutations
                    for (let i = 0; i < ml.length; i++)
                        if (ml[i][`type`] === `childList`) {
                            const
                                // extract properties
                                {addedNodes, removedNodes} = ml[i];
                            addedNodes.forEach(addedNode => {
                                // if it is a match
                                if (addedNode.nodeType === ELEMENT_NODE && addedNode.tagName === tagMatch && (addedNode.id === idMatch || String(addedNode.classList) === classMatch)) {
                                    // log
                                    if (PRINT_DEBUG_MSG === true)
                                        console.log(`${ EXTENSION_NAME }: ${ addedNode.tagName } element with id ${ addedNode.id } and classes ${ addedNode.classList } added to DOM.`);
                                    // execute
                                    if (executeOnAppend && typeof executeOnAppend === `function`)
                                        executeOnAppend(addedNode);
                                    // disconnect observer if needed
                                    if (disconnect === true)
                                        obs.disconnect();
                                    // resolve if needed
                                    if (resolve && typeof resolve === `function`)
                                        return resolve(addedNode);
                                }
                                // eslint compliant
                                return null;
                            });
                            removedNodes.forEach(removedNode => {
                                // if it is a match
                                if (removedNode.nodeType === ELEMENT_NODE && removedNode.tagName === tagMatch && (removedNode.id === idMatch || String(removedNode.classList) === classMatch)) {
                                    // log
                                    if (PRINT_DEBUG_MSG === true)
                                        console.log(`${ EXTENSION_NAME }: ${ removedNode.tagName } element with id ${ removedNode.id } and classes ${ removedNode.classList } removed from DOM.`);
                                    // execute
                                    if (executeOnRemove && typeof executeOnRemove === `function`)
                                        executeOnRemove(removedNode);
                                    // disconnect observer if needed
                                    if (disconnect === true)
                                        obs.disconnect();
                                    // resolve if needed
                                    if (resolve && typeof resolve === `function`)
                                        return resolve(removedNode);
                                }
                                // eslint compliant
                                return null;
                            });
                        }
                });
            // return
            return observer;
        } catch (err) {
            // reject if needed
            if (reject && typeof reject === `function`)
                return reject(err);
            // else, output message to stderr
            return console.error(err.message);
        }
    },
    // defeat youtube ads
    retrieveChildNode = (selector, idMatch, classMatch, tagMatch) =>
        new Promise((resolve, reject) => {
            try {
                const
                    // isolate node to observe
                    observed = document.querySelector(selector),
                    // setup observer
                    observer = createNodeSubtreeObserver(classMatch, idMatch, tagMatch, null, null, true, resolve, reject);
                // start observing
                observer.observe(observed, {
                    // observe entire node subtree
                    subtree: true,
                    // for addition/removal of child nodes
                    childList: true
                });
            } catch (err) {
                // reject
                reject(err);
            }
        }),
    // skip video ad
    skip = overlay => {
        try {
            // log
            console.log(`${ EXTENSION_NAME }: video ad is beginning.`);
            // retrieve ad type
            const ad = overlay.childNodes.item(2);
            // if ad is skippable
            if (ad instanceof Element && String(ad.classList) === YT_VIDEO_AD_SKIPPABLE_STYLE) {
                // retrieve skip button
                ad.firstChild.childNodes.item(1).firstChild.firstChild
                    // fire click event
                    .click();
                // log
                console.log(`${ EXTENSION_NAME }: video ad skipped.`);
            // if not
            } else
                // throw a generic error
                throw new Error();
        } catch (err) {
            // log
            console.log(`${ EXTENSION_NAME }: video ad is not skippable.`);
        }
    },
    // close overlayed ad
    close = overlay => {
        try {
            // log
            console.log(`${ EXTENSION_NAME }: overlayed ad is showing.`);
            // retrieve close button
            const cl = overlay.firstChild.firstChild.childNodes.item(1).firstChild;
            // if ad is closeable
            if (cl instanceof Element && String(cl.classList) === YT_POPUP_AD_CLOSEABLE_STYLE) {
                cl
                    // fire click event
                    .click();
                // log
                console.log(`${ EXTENSION_NAME }: overlayed ad closed.`);
            // if not
            } else
                // throw a generic error
                throw new Error();
        } catch (err) {
            // log
            console.log(`${ EXTENSION_NAME }: could not close overlayed ad.`);
        }
    };

// discard the window.onload event handler and use an IIFE instead to solve the problem
// of the script not loading after right click on username > open in new tab / new window

(async() => {

    try {

        let
            [ observer, observed ] = [ null, null ];

        // in the event a YT url is directly pasted in the browser's bar, the ad overlay is instantly loaded
        // let's thus try to maximize the chances of getting a monitorable handle for the ad management div
        // by traversing the hierarchy of selectors to it and testing if the corresponding elements are loaded
        // when the script executes

        // attempt to retrieve video ad overlay
        observed = document.querySelector(YT_VIDEO_AD_OVERLAY_SELECTOR);

        // if no ad is playing when the DOM is done loading
        if (observed === null) {

            console.log(`${ EXTENSION_NAME }: waiting for movie player div to load.`);

            // attempt to retrieve video player
            observed = document.querySelector(`#movie_player`);

            if (observed === null)
                // wait for video player to load
                observed = await retrieveChildNode(`body`, `movie_player`, null, `DIV`);

            console.log(`${ EXTENSION_NAME }: movie player div loaded, waiting for ad management layer.`);

            // attempt to retrieve ad management layer
            observed = document.querySelector(YT_AD_MANAGER_SELECTOR);

            if (observed === null)
                // wait for ad management layer to load
                observed = await retrieveChildNode(`#movie_player`, null, YT_AD_MANAGER_DIV_STYLE, `DIV`);

        // else
        } else {

            console.log(`${ EXTENSION_NAME }: ad overlay already loaded, attempting skip.`);

            // skip the initial ad
            skip(observed);

            // reset observed to ad manager and proceed
            observed = document.querySelector(YT_AD_MANAGER_SELECTOR);
        }

        console.log(`${ EXTENSION_NAME }: ad management layer loaded, monitoring video and popup ads.`);

        // setup skip button observer
        observer = createNodeSubtreeObserver(
            YT_VIDEO_AD_OVERLAY_STYLE,
            null,
            `DIV`,
            // video ad begins
            skip,
            // video ad ends
            null,
            // keep observer running
            false,
            null,
            null);

        // start observing
        observer.observe(observed, {
            // observe entire node subtree
            subtree: true,
            // for addition/removal of child nodes
            childList: true
        });

        // setup popup ads observer
        observer = createNodeSubtreeObserver(
            YT_POPUP_AD_OVERLAY_STYLE,
            null,
            `DIV`,
            // popup ad begins
            close,
            // popup ad ends
            null,
            // keep observer running
            false,
            null,
            null);

        // start observing
        observer.observe(observed, {
            // observe entire node subtree
            subtree: true,
            // for addition/removal of child nodes
            childList: true
        });

    } catch (err) {
        // output message to stderr
        console.error(`${ EXTENSION_NAME }: ${ err.message }`);
    }

})();