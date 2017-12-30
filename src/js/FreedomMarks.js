debug = false;

jQuery.support.cors = true;

document.addEventListener("DOMContentLoaded", function(event) {

    if(debug) console.log("DOM fully loaded and parsed");

    var sUsrAg = navigator.userAgent;

    if(typeof sUsrAg.indexOf !== 'undefined' && sUsrAg.indexOf("Chrome") > -1) {
        browser = new ChromePromise();
    }

    // retrieves settings from local storage
    browser.storage.local.get('freedommarks_settings').then(function(result) {

        var settings = result.freedommarks_settings;
        if(debug) console.log(settings);

        if(!settings.server_url) {
            addNotification('error','Please set the Options for this extension');
            return false;
        }

        server_url = settings.server_url;
        username = settings.username;
        password = settings.password;

        if(settings.bookmark_main_tab) {
            if(debug) console.log('bookmark tab is supposed to have focus');
            var bookmarkLabel_active_status = document.getElementById("save-bookmark-tab-label");
            bookmarkLabel_active_status.className += "active";

            var bookmarkTab_active_status = document.getElementById("save-bookmark-tab");
            bookmarkTab_active_status.className += "active";
        }

        if(settings.search_main_tab) {
            if(debug) console.log('search tab is supposed to have focus');
            var searchLabel_active_status = document.getElementById("search-bookmarks-tab-label");
            searchLabel_active_status.className += "active";

            var searchTab_active_status = document.getElementById("search-bookmarks-tab");
            searchTab_active_status.className += "active";
        }

    });

    //Checks if the URL of the current tab is already saved on the server
    CurrentBrowserTab(searchForCurrentUrl);


    // when a tab-pane gets activated ...
    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        // when necessary, it focuses the "search-tags" input box
        e.preventDefault();
        var target = $(e.target).attr("href"); // activated tab's ID
        if (target == '#save-bookmark-tab') {
            if(debug) console.log('first tab has been activated');
            // closes the notification area
            $('#notification-area').hide();
            $('#bookmark-title').focus();
            var searchTab = document.getElementById("search-bookmarks-tab");
            searchTab.className = "tab-pane";
        }
        if (target == '#search-bookmarks-tab') {
            if(debug) console.log('second tab has been activated');
            $('#search-terms').focus();
            var bookmarkTab = document.getElementById("save-bookmark-tab");
            bookmarkTab.className = "tab-pane";
        }
    });


    //Searches for tags when the user hits enter and one the search-bookmarks-tab input fields has focus
    $('#search-tags').keypress(function (e) {
        var key = e.which;
        // the enter key code
        if(key == 13) {
            searchByTermsOrTags();
            e.preventDefault();
            $('#search-bookmarks-tab').show();
        }
    });
    $('#search-terms').keypress(function (e) {
        var key = e.which;
        // the enter key code
        if(key == 13) {
            searchByTermsOrTags();
            e.preventDefault();
            $('#search-bookmarks-tab').show();
        }
    });

    $('#search-by-tags-button').click(function (e) {
        searchByTermsOrTags();
    });

    $('#save-bookmark-button').click(function (e) {
        saveBookmark();
    });

    $('#delete-bookmark-button').click(function (e) {
        deleteBookmark(e);
    });
});



function testCorsEnabled(url){
    if(debug) console.log('function: ' + arguments.callee.name);

    $.get( url, function( data, textStatus, request) {
        var header = request.getResponseHeader('access-control-allow-origin');

        if(typeof header !== 'undefined') {
             console.log('CORS is not enabled for url: ' + url);
        } else {
            console.log('CORS is enabled for url: ' + url);
            console.log(header);
        }
    });
}

function getTagsArrayFromElement(element_id){
    var input_tags = $('#'+element_id).val().split(',');
    var tags = [];
    for (let tag of input_tags) {
        var trimmed_tag = tag.trim();
        if (trimmed_tag) {
            tags.push(trimmed_tag);
        }
    }
    tags.push(" ");
    return tags;
}

function CurrentBrowserTab(callback) {
    if(debug) console.log('function: ' + arguments.callee.name);
    var queryInfo = {
        active: true,
        currentWindow: true
    };

    var browserTab = chrome.tabs.query(queryInfo, function(tabs) {
        var tab = tabs[0];
        var browserTab = {
            url: tab.url,
            title: tab.title
        }
        callback(browserTab);
    });
}

function fillForm(browserTab){
    if(debug) console.log('function: ' + arguments.callee.name);
    // This fills in the hidden form field "bookmark-url" with tab's URL
    //document.getElementById("bookmark-url").value = browserTab.url;
    //This ifills in the bookmark title with the page title of the current tab
    //document.getElementById("bookmark-title").value = browserTab.title;
    $('#bookmark-title').val(browserTab.title);
    $('#bookmark-url').value = browserTab.url;

}

function searchForCurrentUrl(browserTab){

    if(debug) console.log('function: ' + arguments.callee.name);

    // In any case fills in the hidden form field "bookmark-url" with tab's URL
    document.getElementById("bookmark-url").value = browserTab.url;

    var endpoint = server_url + '/index.php/apps/bookmarks/public/rest/v2/bookmark_by_url';

    console.log('url: ' + browserTab.url);

    $.ajax({
        url: endpoint,
        method: "GET",
        //basic authentication
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "Basic " + btoa(username + ":" + password));
        },
        data: {
            url: browserTab.url,
            user: username
        },
        dataType: 'json',
    })
    .success(function(result){

        if(debug) console.log('function: search by url success');
        if(debug) console.log(result);

        if(result.status == 'error'){
            addNotification('Server Error',result.message);
        }

        if(typeof result.bookmark.id == 'undefined') {
            CurrentBrowserTab(fillForm);
        } else {
            var bookmark = result.bookmark;
            if(debug) console.log(bookmark);

            $('#bookmark-additional-info').show();
            $('#bookmark-id').val(bookmark.id);
            $('#bookmark-title').val(bookmark.title);
            $('#bookmark-tags').val(bookmark.tags);
            $('#bookmark-description').val(bookmark.description);
            var d = new Date(bookmark.added*1000);
            var added = ISODateString(d);
            $('#bookmark-created_at').text(added);
            var d = new Date(bookmark.lastmodified*1000);
            var lastmodified = ISODateString(d);
            $('#bookmark-updated_at').text(lastmodified);

            //buttons
            $('#save-bookmark-button').show();
            $('#save-bookmark-button').text("Update");
            $('#delete-bookmark-button').show();
        }
    })
    .error(function(XMLHttpRequest, status, errorThrown){
        if(debug) {
            console.log('ajax error');
            console.log("Status: " + status);
            console.log("Error: " + errorThrown);
        }
    })
}

function saveBookmark(){

    if(debug) console.log('function: ' + arguments.callee.name);

    var endpoint = server_url + '/index.php/apps/bookmarks/public/rest/v2/bookmark';

    if(debug) console.log('endpoint: ' + endpoint);

    //trim and replace trailing slash
    var bookmarkurl = $('#bookmark-url').val().trim().replace(/\/$/, "");
    if(debug) console.log('bookmarkurl: ' + bookmarkurl);

    $.ajax({
        url: endpoint,
        method: "POST",
        //basic authentication
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "Basic " + btoa(username + ":" + password));
        },
        data: {
            url: bookmarkurl,
            title: $('#bookmark-title').val(),
            description: $('#bookmark-description').val(),
            item: getTagsArrayFromElement('bookmark-tags'),
            is_public: true
        },
        dataType: 'json',
    })
    .success(function(result){
        console.log(result);
        var bookmark = result.item;
        if(bookmark.id){
            $('#save-bookmark-button').hide();
            $('#delete-bookmark-button').show();
            $('#bookmark-id').val(bookmark.id);
            addNotification('success','Bookmark saved!');
        } else {
            addNotification('error','Bookmark not saved. Please check your settings.');
        }
    })
    .error(function(XMLHttpRequest, status, errorThrown){
        if(debug) {
            console.log('ajax error');
            console.log("Status: " + status);
            console.log("Error: " + errorThrown);
        }
    });

}

function searchByTermsOrTags(){

    if(debug) console.log('function: ' + arguments.callee.name);
    if(debug) console.log('server_url: ' + server_url);
    if(debug) console.log('username: ' + username);
    if(debug) console.log('password: ' + password);

    var endpoint = server_url + '/index.php/apps/bookmarks/public/rest/v2/bookmark';

    var terms = getTagsArrayFromElement('search-terms');
    var tags = getTagsArrayFromElement('search-tags');
    var conjunction = $("input[name='conjunction']:checked"). val();
    var page = 0;
    if($("input[name='disable_paging']:checked"). val()) {

        var page = -1;
    }
    searchBookmarks(endpoint, terms, tags, conjunction, page);
}


function searchBookmarks(endpoint, terms, tags, conjunction, page){

    if(debug) console.log('function: ' + arguments.callee.name);
    if(debug) testCorsEnabled(endpoint);

    var select = ['id','url','title','tags', 'description', 'lastmodified'];
    if(terms.length == 0) {
        var terms = "";
    }
    $.ajax({
        url: endpoint,
        method: "GET",
        //basic authentication
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "Basic " + btoa(username + ":" + password));
        },
        data: {
            search: terms,
            tags: tags,
            conjunction: conjunction,
            page: page,
            limit: 30
        },
        dataType: 'json',
    })
    .success(function(result){

        if(debug) console.log('success');
        if(debug) console.log(result);

        if(result.status == 'error'){
            addNotification('Server Error',result.message);
        } else {
            var bookmarks = result.data;
            if(debug) console.log(bookmarks);
            makeBookmarksList(bookmarks, 'bookmarks-list');
        }
    })
    .error(function(XMLHttpRequest, status, errorThrown){
        if(debug) {
            console.log('ajax error');
            console.log("Status: " + status);
            console.log("Error: " + errorThrown);
        }
    });
    // .complete(function(jqXHR, textStatus){
    //     if(debug) {
    //         console.log('ajax completed');
    //         console.log(jqXHR);
    //         console.log(textStatus);
    //     }
    // });
}


function deleteBookmark(e, bookmarkId){

    if(debug) console.log('function: ' + arguments.callee.name);

    if(!bookmarkId && $('#bookmark-id').val().length == 0) {
        if(debug) console.log('no bookmark id found');
        return false;
    }

    if(!bookmarkId){
        bookmarkId = $('#bookmark-id').val();
    }


    // TODO this doesn't work as expected on FF because it closes the extension tab
    // https://developer.mozilla.org/en-US/Add-ons/WebExtensions/User_interface_components#Popups
    // https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Anatomy_of_a_WebExtension
    // Maybe something can be done with this
    // https://github.com/mdn/webextensions-examples/tree/master/window-manipulator
    if (!window.confirm("Do you really want to delete this bookmark?")) {
        e.preventDefault();
        return false;
    }

    var endpoint = server_url + '/index.php/apps/bookmarks/public/rest/v2/bookmark/' + bookmarkId;

    $.ajax({
        method: "DELETE",
        url: endpoint,
        //basic authentication
        beforeSend: function (xhr) {
            xhr.setRequestHeader("Authorization", "Basic " + btoa(username + ":" + password));
        },
        data: {
            id: bookmarkId
        },
        dataType: 'json'
    })
    .success(function(result){
        $('#bookmark-' + bookmarkId).hide(); //this hides the deleted bookmark from the bookmark list
        CurrentBrowserTab(fillForm);
        $('#delete-bookmark-button').hide();
        $('#save-bookmark-button').text("Add");
        $('#save-bookmark-button').show();
        addNotification('success','bookmark deleted');
    })
    .error(function(XMLHttpRequest, status, errorThrown){
        if(debug) {
            console.log('ajax error');
            console.log("Status: " + status);
            console.log("Error: " + errorThrown);
        }
    });
}

// https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/notifications
// This could become a browser notification
function addNotification(type,message){
    if(debug) console.log('function: ' + arguments.callee.name);

    var div = document.getElementById('notification-area');
    div.innerHTML = "";

    var p = document.createElement("p");
    p.textContent = message;
    if(type == "success"){
        p.className = "notify";
    }
    if(type == "error") {
        p.className = "alarm";
    }
    div.appendChild(p);
    $('#notification-area').show(0).delay(2500).hide(0);
}
