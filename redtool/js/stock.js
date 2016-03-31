/* ---------------------------------  Portfolio -----------------------------------------------------*/
var Portfolio = function (pfid)  {
    this.pfid = pfid;
    this.storage_key = "profile_data"+this.pfid;
    this.table_id = "#data_table_tb"+this.pfid;
    this.table_api = null;
    this.is_fund = true;
    this.ids = '';
    this.sina_ids = [];
    this.last_update = null;
    this.values = {};
    this.button =  $('<button class="profile_btn btn btn-default btn-sm btn-block">')
					.attr("id", "_pfbtn"+pfid)
					.attr("data-pfid", pfid)
					.append($('<span class="glyphicon glyphicon-option-vertical" aria-hidden="true"></span>'))
					.append($('<span>组合'+pfid+'</span>'));
    this.button_wrap = $('<li>').css("display", "none").append(this.button).appendTo("#profile_nav").slideDown();
    this.restore();
}


Portfolio.prototype.objectfy = function () {
    return {
        "is_fund":this.is_fund,
        "ids":this.ids,
        "sina_ids":this.sina_ids,
        "values":this.values,
        "last_update":this.last_update
    };
}

Portfolio.prototype.save = function () {
    var vals = this.objectfy();
    localStorage.setItem(this.storage_key, JSON.stringify(vals));
}

Portfolio.prototype.restore = function () {
    var dt = localStorage.getItem(this.storage_key);
    if (dt != null) {
        var vals = JSON.parse(dt);
        $.extend(this, vals);
    }
}

Portfolio.prototype.remove_data = function () {
    localStorage.removeItem(this.storage_key);
}

Portfolio.prototype.sync_from_dom = function () {
    var ids = $.trim($('#sharenums').val());
    var is_fund = $("#is_fund").prop('checked');
    if(is_fund != this.is_fund) {
        this.destroy_table();
    }
    this.ids = ids;
    this.is_fund = is_fund;
    this.parse_ids();
    this.save();
}

Portfolio.prototype.sync_to_dom = function () {
    $('#sharenums').val(this.ids);
    $("#is_fund").prop("checked", this.is_fund);
}

Portfolio.prototype.parse_ids = function () {

    var qs = [];

    if (this.ids.length > 0) {
        if(this.is_fund) {
            qs = $.map(this.ids.match(/[0-9]{6}/g), function(v) { return 'f_'+v; });
        }else{
            qs = $.map(this.ids.match(/[0-9]{6}/g), function(v) {
                var marketsig = parseInt(v.substr(0,1));
                var pfx = marketsig>=5?'s_sh':'s_sz';
                return pfx+v;
            });
        }
    }

    this.sina_ids = qs;
    return qs;
}

Portfolio.prototype.init_data_table = function () {

    var tbid = this.table_id;

    if(!$(tbid).length) {
        $('<table class="table">').attr("id", tbid.substr(1)).appendTo("#data_table_div");
    }

    var colms, drawcb;

    var val_render = function ( data, type, row ) {
        var cls = data.substr(0,1) === '-' ? "price negtive":"price";
        return '<span class="'+cls+'">'+data+'</span>';
    }

    if(!$.fn.dataTable.isDataTable(tbid) && this.table_api === null) {

        if(this.is_fund) {
            var tpl_fundimg = _.template($("#tpl_fundimg").html());
            colms = [
                { "title": "No",
                  "width": "5%"},
                { "title": "名称",
                    "className":"dt-nowrap tg_name",
                    "orderable": false,
                    "width": "30%",
                    "render": function ( data, type, row ) {
                        var code = row[row.length-1].substr(2);
                        var name = row[1];
                        return tpl_fundimg({code:code, name:name});
                       }
                },
                { "title": "净值",
                    "render": val_render,
                },
                { "title": "累计净值",
                    "render": val_render,
                },
                { "title": "昨净",
                    "render": val_render,
                },
                { "title": "净值日期", "orderable": false,
                },
                { "title": "？？", "visible": false },
                { "title": "涨跌幅",
                    "data": function ( row, type, val, meta ) {
                        var val = parseFloat(row[2]);
                        var lastval = parseFloat(row[4]);
                        return ((val-lastval)/lastval*100).toFixed(2)+'%';
                    },
                    "render": val_render,
                }
            ];

            drawcb = function( settings ) {
                var tb = this.api();
                tb.rows().every( function () {
                    var row = this.data();
                    var incr = parseFloat(row[2]) - parseFloat(row[4]);
                    if(incr > 0) { $(this.node()).addClass('reddata'); }
                    else if (incr < 0) { $(this.node()).addClass('greendata'); }
                });
            }


        } else {
            var tpl_shareimg = _.template($("#tpl_shareimg").html());
            colms = [
                { "title": "No",
                  "width": "5%"},
                { "title": "名称",
                    "className":"dt-nowrap tg_name",
                    "orderable": false,
                    "render": function ( data, type, row ) {
                        var code = row[row.length-1].substr(2), name = row[1];
                        return tpl_shareimg({code:code, name:name});
                    }
                },
                { "title": "现价",
                    "render": val_render,
                },
                { "title": "涨跌",
                    "render": val_render,
                },
                { "title": "涨跌幅",
                    "render": function (d,t,r){return val_render(d+'%',t,r);},
                },
                { "title": "现量", "visible": false },
                { "title": "现手", "visible": false }
            ];

            drawcb = function( settings ) {
                var tb = this.api();
                tb.rows().every( function () {
                    var row = this.data();
                    var incr = parseFloat(row[3]);
                    if(incr > 0) { $(this.node()).addClass('reddata'); }
                    else if (incr < 0) { $(this.node()).addClass('greendata'); }
                });

            }
        }

        var tb = $(tbid).dataTable( {
            "paging":   false,
            "ordering": true,
            "order":    [0,'asc'],
            "info":     false,
            "searching":false,
            "deferRender": true,
            "columns": colms,
            "drawCallback":drawcb
        });

        this.table_api = tb.api();
    }
}

Portfolio.prototype.show_data_table = function () {
    $("#last_update").text(this.last_update);

    var _this = this;
    var dataSet = $.map(this.sina_ids, function (v,i) {
        var val = _this.values[v];
        if(val) {
            var r = val.split(',');
            r.unshift(i+1);
            r.push(v);
            return [r];
        }
    });

    this.init_data_table();
    this.table_api.clear().rows.add(dataSet).draw();
    $(this.table_id).parent(".dataTables_wrapper").slideDown();

    var vals = $.map(dataSet, function (s) { return s[2]; });
    $("#neat_val").text(vals.join("\n"));
}

Portfolio.prototype.update_data = function (callback) {
    var qs = this.parse_ids();

    if(qs.length > 0) {
        console.log("update pfid " + this.pfid);
        var qsstr = 'list='+qs.join(',');
        var _this = this;
        $.getScript('api.php?'+qsstr, function () {
            $.each(qs, function (i,v) {
                _this.values[v] = window['hq_str_'+v];
            });
            _this.last_update = new Date().toLocaleString();
            _this.save();

            if(typeof callback === 'function') {
                callback(_this);
            }
        });
    }

    return qs.length;
}

Portfolio.prototype.destroy_table = function () {
    if(this.table_api) {
        this.table_api.destroy(true);
        this.table_api = null;
    }
}

Portfolio.prototype.destroy_button = function () {
    $("#_pfbtn"+this.pfid).remove();
}

Portfolio.prototype.activate = function () {
    this.sync_to_dom();
    this.init_data_table();
    this.show_data_table();
    if(!this.button.hasClass("active")) {
        this.button.addClass("active")
    }
}

Portfolio.prototype.deactivate = function () {
    $(this.table_id).parent(".dataTables_wrapper").slideUp();
    this.button.removeClass("active");
}

/* --------------------------------------------------------------------------------------------------------*/

/* ---------------------------------  PortfolioIdList -----------------------------------------------------*/

var PortfolioIdList = function ()  {
    this.storage_key = "pf_list";
    this.list = ["1"];
    this.portfolio = {};
    this.curpfid = localStorage.getItem('cur_pfid') || "1";
    this.restore();
}

PortfolioIdList.prototype.sync_svr = function () {
    var obj = {};
    obj[this.storage_key] = this.list;
    obj["portfolio"] = {};
    obj["syncdate"] = new Date().getTime();

    $.each(this.portfolio, function () {
        obj["portfolio"][this.storage_key] = this.objectfy();
    });

    return obj;
}


PortfolioIdList.prototype.reinitialize = function (pfid) {
    $.each(this.portfolio, function() {
        this.destroy_button();
        this.destroy_table();
    });
    this.portfolio = {};
    this.list = [];
    this.restore();
    this.restore_portfolios();
    if(this.list.length > 0) {
        this.switch_portfolio(this.list[0]);
    }
}

PortfolioIdList.prototype.save = function () {
    localStorage.setItem(this.storage_key, JSON.stringify(this.list));
}

PortfolioIdList.prototype.restore = function () {
    var dt = localStorage.getItem(this.storage_key);
    if (dt != null) {
        this.list = JSON.parse(dt);
    }
}

PortfolioIdList.prototype.add = function (pfid) {
    if(typeof pfid !== 'string')
        pfid = pfid.toString();
    this.list.push(pfid);
    this.portfolio[pfid] = new Portfolio(pfid);
    this.save();
}

PortfolioIdList.prototype.remove = function (pfid) {
    delete this.portfolio[pfid];
    this.list = this.list.filter(function(x) { return x !== pfid;});
    this.save();
}

PortfolioIdList.prototype.restore_portfolios = function () {
    var _this = this;
    $.each(this.list, function(i,v) {
        _this.portfolio[v] = new Portfolio(v);
    });
}

PortfolioIdList.prototype.current_portfolio = function () {
    if(!(this.curpfid in this.portfolio)) {
        this.curpfid = this.list[0];
    }
    return this.portfolio[this.curpfid];
}

PortfolioIdList.prototype.remove_current_portfolio = function () {
    this.remove(this.curpfid);
}

PortfolioIdList.prototype.is_current_portfolio = function (pfid) {
    return this.curpfid == pfid;
}

PortfolioIdList.prototype.switch_portfolio = function (pfid) {
    if(this.curpfid in this.portfolio) {
        this.portfolio[this.curpfid].deactivate();
    }
    this.curpfid = pfid;
    this.portfolio[this.curpfid].activate();
    localStorage.setItem('cur_pfid', this.curpfid);
}


/* --------------------------------------------------------------------------------------------------------*/

/* ------------------------------------jQuery Event Handlings----------------------------------------------*/

var _reg_event_handlers = function () {

    msgbar("Initiating ... Registering Handlers ...", true);

    /* ----- NAV Buttons ------- */
    $('#redraw').click(function(evn) {
        var o = _List.current_portfolio();
        o.table_api.order( [ 0, 'asc' ] ).draw();
        return false;
    });

    $('#update_share').click(function(event) {
        var cnt = 0;
        var $btn = $(event.currentTarget).button('loading');
        $.each(_List.portfolio, function () {
            var len = this.update_data(function (pfo) {
                if(pfo.pfid === _List.curpfid) {
                    console.log("refresh pfid" + pfo.pfid);
                    pfo.show_data_table();
                }
                if(--cnt === 0) {
                    $btn.button('reset');
                }
            });
            if (len > 0) cnt++;
        });
        return false;
    });

    $("#clear_current").click(function () {
        var r = confirm("Confirm");
        if (r === true) {
            var o = _List.current_portfolio();
            o.destroy_table();
            o.destroy_button();
            o.remove_data();
            _List.remove_current_portfolio();
            $(".profile_btn:last").trigger('click');
        }
        return false;
    });
    /*----------------------------------------*/

    /* ----------- Profile Button ------------*/
    $("#profile_nav").on("click", "button.profile_btn", function(evn) {
        var pfid = $(evn.currentTarget).attr("data-pfid");
        if (!_List.is_current_portfolio(pfid)) {
            _List.switch_portfolio(pfid);
        }

        return false;
    });

    $("#btn_add_profile").click(function () {
        var last = $(".profile_btn:last").attr("data-pfid");
        if(typeof last === 'undefined') last = 0;
        var pfid = (parseInt(last)+1).toString();
        _List.add(pfid);
        return false;
    });
    /*----------------------------------------*/

    /*--------------Input Controls -----------*/
    $('#sharenums').blur(function () {
        var o = _List.current_portfolio();
        o.sync_from_dom();
        o.save();
    });
    $('#is_fund').click(function () {
        var o = _List.current_portfolio();
        o.sync_from_dom();
        o.save();
    });

    /*----------------------------------------*/

    /*--------------  Modal Events -----------*/
    $('#neat_val_window')
    .on('shown.bs.modal', function () {
        var _v = $("#neat_val");
        var _h = _v.prop("scrollHeight");
        _v.animate({"height":_h},100).select();
    })
    .on('hidden.bs.modal', function () {
        $("#neat_val").outerHeight(0);
    });


    var check_sync = function (code, succ) {
        var json = "/json/"+code+".json";
        console.log("getting "+json);
        return $.getJSON(json)
    }

    $("#sync_svr")
        .on('shown.bs.modal', function () {
            var code = localStorage.getItem("sync_code");
            $("#sync_code").val(code);
            check_sync(code).done(function(json) {
                $("#sync_date").val(new Date(json.syncdate).toLocaleString());
            });
        });


    $('#sync_code').blur(function (evn) {
        $("#sync_date").val('Loading...');
        var code = $("#sync_code").val();
        localStorage.setItem("sync_code", code);
        check_sync(code)
            .done(function(json) {
                $("#sync_date").val(new Date(json.syncdate).toLocaleString());
            })
            .fail(function () {
                $("#sync_date").val('No such code.');
            });
    });

    $('#sync_upload').on('click', function (env) {
        var $btn = $(env.currentTarget).button('loading');
        var code = $("#sync_code").val();
        var sync = JSON.stringify(_List.sync_svr());
        $.ajax({
            method: "POST",
            url: "/storage.php",
            data: { code: code, sync: sync}
        })
        .done(function( msg ) {
            check_sync(code)
                .done(function(json) {
                    $("#sync_date").val(new Date(json.syncdate).toLocaleString());
                })
                .fail(function () {
                    $("#sync_date").val('No such code.');
                });
        })
        .always(function() {
            $btn.button('reset');
        });
    });


    $('#sync_download').on('click', function (env) {
        var $btn = $(env.currentTarget).button('loading');
        var code = $("#sync_code").val();
        if(code.length == 0) {return;}

        check_sync(code)
            .done(function(json) {
                localStorage.setItem(_List.storage_key, JSON.stringify(json.pf_list));
                $.each(json.portfolio, function (k,v) { localStorage.setItem(k, JSON.stringify(v)); });
                _List.reinitialize();
            })
            .fail(function () {
                $("#sync_date").val('No such code.');
            })
            .always(function() {
                $btn.button('reset');
            });
    });

    $(document.body).on('click', 'a.has-popover', function (evn) {
      evn.preventDefault();
    });

    $(document.body).popover({
      selector: '.has-popover',
      placement: 'right',
      container: 'body',
      // trigger: 'click',
      // template: '<div class="popover pricepop" role="tooltip"><div class="popover-content"></div></div>',
      html: true
    });

    /*----------------------------------------*/
}

var _ui_init = function () {
    msgbar("Building UI Components ...", true);
    window._List = new PortfolioIdList();
    _List.restore_portfolios();
}


var msgbar = function (msg, show) {
    var b = $("#msgbar");
    if(msg.length>0)
        b.find('span.msg').text(msg);
    if(show === true) {
        b.slideDown();
    }else if(show === false) {
        b.slideUp();
    }
}
