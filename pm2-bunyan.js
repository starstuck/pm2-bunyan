#!/usr/bin/env node
/**
 * Small app to wrap pm2 logs in bunyan json
 *
 * TODO: invoke bunyan tool automatically, preferably with custom renderers
 */

var child_process = require('child_process'),
    ipm2 = require('pm2-interface')();

ipm2.on('ready', function() {
    
    ipm2.bus.on('log:*', function(event, arg){
        var proc = arg.process,
            data = arg.data || arg,
            str = data.str || data,
            obj = {};
        
        if (! data) return;
        try {
            obj = JSON.parse(data);
        } catch (err) {
            obj.name = proc.name;
            obj.hostname = 'unknown';
            obj.pid = '?';
            obj.level = (event == 'err') ? 40 : 30;
            obj.time = new Date(arg.at * 1000).toISOString();
            obj.msg = JSON.stringify(data || arg);
            obj.v = 0;
        };
        // TODO: postpone until we send it through bunyan with custom renderer
        //obj.pm = {
        //    name: proc.name,
        //    pm_id: proc.pm_id,
        //    stream: event
        //};
        console.log(JSON.stringify(obj));
    });
});
