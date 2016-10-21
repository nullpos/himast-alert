
$(document).ready(function() {
    function init() {
        for(key in info.config.room) {
            room.insertElem(room.createElem(key));
        }

        for(key in info.config.settings.snooze.list) {
            snooze.insertElem(snooze.createElem(info.config.settings.snooze.list[key]));
        }

        $("#volume-text").text(Math.floor(info.config.settings.audio.volume * 100));
        $("#now-volume-text").text(Math.floor(info.config.settings.audio.volume * 100));
        audio.init();
        versions.init();

        $(function() {
            $('#tabs').tabs();

            $('#rooms').selectable({
                stop: room.selectStop
            });
            $('#config-update-btn').button({disabled: true});
            $('#config-update-btn').on('click', function() {
                model.updateRoom();
            });

            $('#snooze-time').selectable({
                stop: snooze.selectStop
            });
            $('#config-add-time').button({disabled: true}).on('click', function() {
                model.updateSnooze({method: 'add'});
                snooze.addItem();
            });
            $('#config-edit-time').button({disabled: true}).on('click', function() {
                model.updateSnooze({method: 'edit'});
                snooze.editItem();
            });;
            $('#config-delete-time').button({disabled: true}).on('click', function() {
                model.updateSnooze({method: 'delete'});
                snooze.deleteItem();
            });;
            $('#time-text').on('keyup', function(e) {
                view.updateSnooze();
            });

            $('#volume-slider').slider({
                min: 0,
                max: 100,
                value: info.config.settings.audio.volume * 100,
                slide: function(event, ui) {
                    $("#volume-text").text(ui.value);
                }
            });
            $('#play-audio').button().on('click', function() {
                audio.play();
            });
            $('#update-audio').button().on('click', function() {
                $("#now-volume-text").text($('#volume-slider').slider("value"));
                model.updateAudio();
            });
            $('#file-audio').on('change', function(e) {
                audio.update(e);
            });
            $('#set-default-audio').button().on('click', function() {
                audio.setDefault();
                model.updateAudio();
            });
        });
    }

    var versions = (function() {
        var data = [
            {
                "version": "v1.1.0",
                "description": ["通知設定をオンにしている配信中のページ数を表示するバッジを追加",
                                    "ポップアップに配信ページへのボタンを追加"]
            },
            {
                "version": "v1.0.10",
                "description": ["バグ修正"]
            },
            {
                "version": "v1.0.9",
                "description": ["バグ修正"]
            },
            {
                "version": "v1.0.8",
                "description": ["更新履歴を追加"]
            },
            {
                "version": "v1.0.7",
                "description": ["アラート音の変更に対応"]
            },
            {
                "version": "v1.0.6",
                "description": ["音による通知に対応"]
            },
            {
                "version": "v1.0.1-v1.0.5",
                "description": ["忘れた"]
            },
            {
                "version": "v1.0.0",
                "description": ["初版を公開"]
            }
        ];
        function init() {
            var list = $('<ul></ul>');
            for (var i = 0; i < data.length; i++) {
                var ver = $('<li></li>').append($('<p></p>').text(data[i].version));
                var des = $('<ul></ul>');
                for(var j in data[i].description) {
                    des.append($('<li></li>').text(data[i].description[j]))
                }
                list.append(ver.append(des));
            };
            $('#version-text').append(list);
        }
        return {
            init: init
        };
    })();

    var model = (function() {
        function updateRoom() {
            var rooms = room.getNowConfig();
            for(key in rooms) {
                info.config.room[rooms[key]].tab = $('#check-tab').prop("checked");
                info.config.room[rooms[key]].notify = $('#check-notify').prop("checked");
                info.config.room[rooms[key]].audio = $('#check-audio').prop("checked");
            }
            chrome.storage.local.set(info);
        }

        function updateSnooze(opt) {
            if(opt.method === 'add') {
                info.config.settings.snooze.list.push($('#time-text').val() * 1);
            } else if(opt.method === 'edit') {
                info.config.settings.snooze.list.push($('#time-text').val() * 1);
                info.config.settings.snooze.list = info.config.settings.snooze.list.filter(function(v) {
                    return v != snooze.getNowConfig()[0];
                });
            } else if(opt.method === 'delete') {
                var ar = info.config.settings.snooze.list;
                var times = snooze.getNowConfig();
                for(key in times) {
                    ar = ar.filter(function(v) {
                        return v != times[key];
                    });
                }
                info.config.settings.snooze.list = ar;
            }
            chrome.storage.local.set(info);
        }

        function updateAudio() {
            info.config.settings.audio.volume = $('#volume-slider').slider("value") / 100;
            info.config.settings.audio.src = audio.getSrc();
            chrome.storage.local.set(info);
        }

        return {
            updateRoom: updateRoom,
            updateSnooze: updateSnooze,
            updateAudio: updateAudio
        };
    })();

    var view = (function() {
        var numre = /^\d+$/i;

        function setRoomConfig() {
            var rooms = room.getNowConfig();
            if(rooms.length == 1) {
                var config = info.config.room[rooms[0]];
                if(config.tab) {
                    $('#check-tab').prop( "checked", true );
                } else {
                    $('#check-tab').prop( "checked", false );
                }
                if(config.notify) {
                    $('#check-notify').prop( "checked", true );
                } else {
                    $('#check-notify').prop( "checked", false );
                }
                if(config.audio) {
                    $('#check-audio').prop( "checked", true );
                } else {
                    $('#check-audio').prop( "checked", false );
                }
            } else {
                $('#check-tab').prop( "checked", false );
                $('#check-notify').prop( "checked", false );
                $('#check-audio').prop( "checked", false );
            }
        }

        function setSnoozeConfig() {
            var times = snooze.getNowConfig();
            if(times.length === 1) {
                var re = new RegExp("^" +times[0]+ "分$");
                var el = $("li.snooze.ui-selected").filter(function() {
                    return re.test($(this).text());
                });
                $('#time-text').val(times[0]);
            }
        }

        function enableBtn(val) {
            if(val === 'room') {
                var rooms = room.getNowConfig();
                if(rooms.length != 0) {
                    $('#config-update-btn').button('enable');
                } else {
                    $('#config-update-btn').button('disable');
                }
            } else if(val === 'snooze') {
                var times = snooze.getNowConfig();
                if(times.length == 0) {
                    $('#config-edit-time').button('disable');
                    $('#config-delete-time').button('disable');
                } else if(times.length == 1){
                    if(numre.test($('#time-text').val())) {
                        $('#config-edit-time').button('enable');
                    } else {
                        $('#config-edit-time').button('disable');
                    }
                    $('#config-delete-time').button('enable');
                } else {
                    $('#config-edit-time').button('disable');
                    $('#config-delete-time').button('enable');
                }
                if(numre.test($('#time-text').val())) {
                    $('#config-add-time').button('enable');
                } else {
                    $('#config-add-time').button('disable');
                }
            }
        }

        function toggleWarn(val) {
            if(val === 'room') {
                var warn = $('#room-config > #room-warn-multi');
                var rooms = room.getNowConfig();
                if(warn.css('display') == 'none' && rooms.length > 1) {
                    warn.toggle('blind', null, 500);
                } else if(warn.css('display') != 'none' && rooms.length < 2) {
                    warn.toggle('blind', null, 500);
                }
            } else if(val === 'snooze') {
                var warn = $('#snooze-config > #snooze-warn-multi');
                var times = snooze.getNowConfig();
                if(warn.css('display') == 'none' && times.length > 1) {
                    warn.toggle('blind', null, 500);
                } else if(warn.css('display') != 'none' && times.length < 2) {
                    warn.toggle('blind', null, 500);
                }
            }
        }

        function updateRoom() {
            toggleWarn('room');
            enableBtn('room');
            setRoomConfig();
        }

        function updateSnooze() {
            toggleWarn('snooze');
            enableBtn('snooze');
            setSnoozeConfig();
        }

        return {
            updateRoom: updateRoom,
            updateSnooze: updateSnooze
        };
    })();

    var room = (function(){
        var nowConfig = [];

        function clearNowConfig() {
            nowConfig = [];
        }

        function addNowConfig(room) {
            nowConfig.push(room);
        }

        function getNowConfig() {
            return nowConfig;
        }

        function createElem(room) {
            return $('<li></li>').addClass('room selecting').text(room);
        }

        function insertElem(e) {
            $('#rooms').append(e);
        }

        function selectStop(event, ui) {
            clearNowConfig();
            $( ".room.ui-selected", this ).each(function() {
                addNowConfig($(this).text());
            });
            view.updateRoom();
        }

        return {
            createElem: createElem,
            insertElem: insertElem,
            clearNowConfig: clearNowConfig,
            addNowConfig: addNowConfig,
            getNowConfig: getNowConfig,
            selectStop: selectStop
        };
    })();

    var snooze = (function() {
        var nowConfig = [];

        function clearNowConfig() {
            nowConfig = [];
        }

        function addNowConfig(time) {
            nowConfig.push(time);
        }

        function getNowConfig() {
            return nowConfig;
        }

        function createElem(time) {
            return $('<li></li>').addClass('snooze selecting').text(time + "分");
        }

        function insertElem(e) {
            $('#snooze-time').append(e);
        }

        function selectStop(event, ui) {
            clearNowConfig();
            $( ".snooze.ui-selected", this ).each(function() {
                addNowConfig($(this).text().replace('分', '') * 1);
            });
            view.updateSnooze();
        }

        function addItem() {
            var time = $('#time-text').val() * 1;
            insertElem(createElem(time));
        }

        function editItem() {
            var time = $('#time-text').val() * 1;
            var re = new RegExp("^" +nowConfig[0]+ "分$");
            var el = $("li.snooze.ui-selected").filter(function() {
                return re.test($(this).text());
            });
            el.text(time + '分');
            nowConfig[0] = time;
        }

        function deleteItem() {
            for(key in nowConfig) {
                var re = new RegExp("^" +nowConfig[key]+ "分$");
                var el = $("li.snooze.ui-selected").filter(function() {
                    return re.test($(this).text());
                });
                el.remove();
            }
            nowConfig = [];
        }

        return {
            getNowConfig: getNowConfig,
            insertElem: insertElem,
            createElem: createElem,
            selectStop: selectStop,
            addItem: addItem,
            editItem: editItem,
            deleteItem: deleteItem
        };
    })();

    var audio = (function() {
        var audio = new Audio();

        function init() {
            if(info.config.settings.audio.src &&
                info.config.settings.audio.src.length > 100) {
                audio.src = info.config.settings.audio.src;
            } else {
                audio.src = "./alert.mp3";
            }
        }

        function readBinary(e) {
            return reader.result;
        }

        function play() {
            audio.volume = $('#volume-slider').slider("value") / 100;
            audio.play();
        }

        function update(e) {
            var reader = new FileReader();
            reader.readAsDataURL(e.target.files[0]);
            reader.onload = function() {
                $('#audio-change-complete').toggle('blind', null, 500).delay(2000).toggle('blind', null, 500);
                audio.src = reader.result;
                model.updateAudio();
            };
        }

        function getSrc() {
            return audio.src;
        }

        function setDefault() {
            delete info.config.settings.audio.src;
            audio.src = "./alert.mp3";
            audio.load();
        }

        return {
            play: play,
            update: update,
            init: init,
            getSrc: getSrc,
            setDefault: setDefault
        };
    })();
    var info = {};
    chrome.runtime.sendMessage({method: 'getInfo'}, function(res) {
        info = res;
        console.log(info);
        init();
    });
});