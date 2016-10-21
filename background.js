
var info = {};

var init = function() {
    var re = /.*/;

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if(request.method === 'getInfo') {
            sendResponse(info);
        } else if(request.method === 'toggleAlarm') {
            info.config.settings.isAlarmOn = request.value;
            storage.save();
            if(request.value === true) {
                alarms.setGettingInfo();
            } else {
                alarms.clear('broadcast');
            }
        } else if(request.method === 'setSnooze') {
            info.config.settings.snooze.onTime = Date.now() + (request.value * 60 * 1000);
            info.config.settings.isAlarmOn = false;
            storage.save();
            alarms.setSnooze(request.value);
        } else if(request.method === 'updateAudio') {
            storage.get();
            alert.initAudio();
        } else if(request.method === 'log') {
            console.log(request.value);
        }
    });

    chrome.storage.onChanged.addListener(function(changes, namespace) {
        if(namespace === 'local') {
            info.config = changes.config.newValue;
            console.log("update: ", info);
        }
    });

    chrome.notifications.onButtonClicked.addListener(function(room) {
        chrome.tabs.create({url: 'http://himast.in/st/' + room});
    });

    chrome.alarms.onAlarm.addListener(function(al) {
        if(al.name === 'broadcast') {
            main.run();
            alarms.setGettingInfo();
        } else if(al.name === 'snooze') {
            info.config.settings.isAlarmOn = true;
            storage.save();
            alarms.setGettingInfo();
        }
    });

    alarms.setGettingInfo();

    main.run();
    alert.initAudio();
}


var alarms = (function(){
    var ALARM_INTERVAL = 3;

    function setGettingInfo() {
        chrome.alarms.create('broadcast', {delayInMinutes: ALARM_INTERVAL});
    }

    function setSnooze(min) {
        chrome.alarms.create('snooze', {delayInMinutes: min});
    }

    function clear(name) {
        chrome.alarms.clear(name);
    }

    return {
        setGettingInfo: setGettingInfo,
        setSnooze: setSnooze,
        clear: clear
    };
})();

var storage = (function() {
    function save() {
        chrome.storage.local.set(info);
        console.log('saving:', info);
    }

    function get(callback) {
        chrome.storage.local.get(function(items) {
            console.log('load: ', items);
            if(items.config) {
                info.config = items.config;
                console.log('load success: ', info);
                if(typeof(callback) === 'function') {
                    callback.call();
                }
            } else {
                info.config = {settings: {isAlarmOn: true, snooze:{list:[60]}, audio: {volume: 1.0}}, room: {}};
                save();
                console.log('initialize: ', info);
                if(typeof(callback) === 'function') {
                    callback.call();
                }
            }
        });
    }
    return {
        save: save,
        get: get
    };
})();


var main = (function(){
    var BCAST_INTERVAL = 15 * 60 * 1000;

    var url = 'http://himast.in/?mode=program&cat=search&sort=fan_view_cnt&st_status=0&isFan=1&rss=1';
    var bre = /放映中:\<b\>(.*?)\<\/b\>\s/i;
    var nre = /http\:\/\/himast\.in\/st\/(.*?)\"/i;

    function run() {
        $.ajax({
            url: url,
            cache: false,
            success: onGetSuccess
        });
    }

    function onGetSuccess(xml, status, jqXHRn) {
        if (status === 'success') {
            var data = parseXml(xml);
            for (var i in data) {
                var content = $(data[i].description.text);
                var room = (content[1].innerHTML).match(nre)[1];
                var broadcast = ((content[4].innerHTML).match(bre)[1] == 'はい') ? true : false;

                if(!info.config.room[room]) {
                    info.config.room[room] = {
                        'broadcast': broadcast,
                        "tab": true,
                        "notify": true,
                        "audio": true
                    };
                } else if(info.config.room[room].tab === undefined ||
                    info.config.room[room].notify === undefined ||
                    info.config.room[room].audio === undefined) {
                    info.config.room[room] = {
                        'broadcast': broadcast,
                        "tab": (info.config.room[room].tab === undefined) ? true : info.config.room[room].tab,
                        "notify": (info.config.room[room].notify === undefined) ? true : info.config.room[room].notify,
                        "audio": (info.config.room[room].audio === undefined) ? true : info.config.room[room].audio
                    };
                }

                if(broadcast) {
                    if(!info.config.room[room].broadcast) {
                        if(info.config.room[room].time) {
                            if(Date.now() - info.config.room[room].time > BCAST_INTERVAL) {
                                alert.run(room);
                            }
                        } else {
                            alert.run(room);
                        }
                    }
                    info.config.room[room].time = Date.now();
                }
                info.config.room[room].broadcast = broadcast;
            }
            storage.save();
            badge.update();
            console.log(info.config.room);
        }
    }

    function parseXml(xml) {
        var row = 0;
        var data = [];
        var nodeName;
        $(xml).find('item').each(function() {
            data[row] = {};
            $(this).children().each(function() {
                nodeName = $(this)[0].nodeName;
                if(nodeName === 'description') {
                    data[row][nodeName] = {};
                    var attributes = $(this)[0].attributes;
                    for (var i in attributes) {
                        data[row][nodeName][attributes[i].name] = attributes[i].value;
                    }
                    data[row][nodeName]['text'] = $(this).text();
                }
            });
            row++;
        });
        return data;
    }

    return {
        run: run
    };
})();

var alert = (function(){
    var audio = new Audio();
    function tab(room) {
        if(info.config.room[room].tab){
            chrome.tabs.create({url: 'http://himast.in/st/' + room});
        }
    }

    function notify(room) {
        var notifyOpt = {
            type: "basic",
            title: "配信通知",
            message: room + "での配信が始まりました。",
            iconUrl: "images/icon128.png"
        };
        if(info.config.room[room].notify){
            chrome.notifications.create(room, notifyOpt);
        }
    }

    function playAudio(room) {
        if(info.config.room[room].audio) {
            initAudio();
            audio.play();
        }
    }

    function initAudio() {
        if(info.config.settings.audio.src &&
            info.config.settings.audio.src.length > 100) {
            audio.src = info.config.settings.audio.src;
        } else {
            audio.src = "./alert.mp3";
        }
        audio.load();
        audio.volume = info.config.settings.audio.volume;
    }

    function run(room) {
        tab(room);
        notify(room);
        playAudio(room);
    }

    return {
        run: run,
        initAudio: initAudio,
        playAudio: playAudio
    };
})();

var badge = (function(){
    function update() {
        var on_live = 0;
        for(var room in info.config.room) {
            if(info.config.room[room].notify && info.config.room[room].broadcast) {
                on_live++;
            }
        }
        if(on_live > 0) {
            chrome.browserAction.setBadgeText({ text: on_live.toString() });
        } else {
            chrome.browserAction.setBadgeText({ text: '' });
        }
    }

    return {
        update: update
    };
})();

(function() {
    storage.get(init);
})();