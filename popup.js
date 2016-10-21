var info = {};

$(document).ready(function() {
    chrome.runtime.sendMessage({'method': 'log', value: 'test'});
    $('#open-opt').on('click', function() {
        chrome.tabs.create({ 'url': 'chrome-extension://'+chrome.runtime.id+'/options.html' });
    });
    $('#onoff').on('click', function() {
        chrome.runtime.sendMessage({'method': 'toggleAlarm', value: $(this).prop('checked')});
    });
    $('#snooze-btn').on('click', function() {
        chrome.runtime.sendMessage({'method': 'setSnooze', value: $('[name=snooze-sel]').val()});
    });

    chrome.runtime.sendMessage({'method': 'getInfo'}, function(item) {
        info = item;
        if(info.config.settings.isAlarmOn) {
            $('#onoff').prop('checked', true);
        } else {
            $('#onoff').prop('checked', false);
        }
        var sel = $('[name=snooze-sel]');
        for(key in info.config.settings.snooze.list) {
            var num = info.config.settings.snooze.list[key]
            var opt = $('<option></option>').val(num).text(num + "分");
            sel.append(opt)
        }
        for(var room in info.config.room) {
            if(info.config.room[room].broadcast) {
                var now_room = room;
                $('#live_page').append($('<button></button></br>')
                    .text(now_room)
                    .on('click', function() {
                        chrome.tabs.create({url: 'http://himast.in/st/' + now_room});
                    }));
            }
        }
    });
});