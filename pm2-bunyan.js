#!/usr/bin/env node
/**
 * Small app to wrap pm2 logs in bunyan json
 */

var VERSION = '0.1.1',
    
    spawn = require('child_process').spawn,
    ipm2 = require('pm2-interface')(),

    opt = require('node-getopt').create([
        ['l', 'level=LEVEL', 
         'Only show messages at or above the specified level. '+
         'You can specify level *names* or the internal numeric ' +
         'values.' ],
        ['c', 'condition=COND',
         'Run each log message through the condition and ' +
         'only show those that return truish. ' +
         '"COND" must be legal JS code. `this` holds ' +
         'the log record. The TRACE, DEBUG, ... FATAL values ' +
         'are defined to help with comparing `this.level`. ' +
         'E.g.:\n' +
         '\t\t\t\t-c \'this.pid == 123\'\n' +
         '\t\t\t\t-c \'this.level == DEBUG\'\n' +
         '\t\t\t\t-c \'this.msg.indexOf("boom") != -1\''],
        ['o', 'output=MODE',
         'Specify an output mode/format. One of\n' +
         '\t\t\t\tlong: (the default) pretty\n' +
         '\t\t\t\tjson: JSON output, 2-space indent\n' +
         '\t\t\t\tjson-N: JSON output, N-space indent, e.g. "json-4"\n' +
         '\t\t\t\tbunyan: 0 indented JSON, bunyan\'s native format\n' +
         '\t\t\t\tinspect: node.js `util.inspect` output\n' +
         '\t\t\t\tshort: like "long", but more concise'],            
        ['h', 'help', 'display this help'],
        ['v' , 'version'             , 'show version']
    ]).bindHelp([
        "Usage: ",
        "  pm2-bunyan [OPTIONS] [name]\n",
        "Utility collecting pm2 logs and filtering through bunyan.\n",
        "If condition is provide, but without level limit, the command will also print error messages, even if they don't match eact condition.\n",
        "Options: ",
        "[[OPTIONS]]"
    ].join("\n")).parseSystem(),

    bunyan_default_condition = 'this.level > ERROR',
    child;


function get_bunyan_args() {
    var opts = opt.options,
        condition = '',
        args = [];

    if (opts.version) {
        console.log(VERSION);
        process.exit(0);
    }

    if (opts.condition) {
        condition = opts.condition;
    }
    if (opt.argv.length > 0) {
        condition += ' && (' + opt.argv.map(function (proc_name) {
            return 'this.pm2.match(/\\[' + proc_name + '-[0-9]+/)';
        }).join(' || ') + ')';
    }
    if (opts.level) {
        args = args.concat(['-l', opts.level]);
    } else if (condition) {
        condition += ' || this.level >= ERROR';
    }
    if (opts.output) {
        args = args.concat(['-o', opts.output]);
    }
    args = args.concat(['-c', condition]);
    return args;
}

function pipe_log(channel, arg){
    var proc = arg.process,
        data = arg.data || arg,
        str = data.str || data,
        obj;
        
    if (! data) return;
    try {
        obj = JSON.parse(data);
    } catch (err) {
        obj = {
            name: proc.name,
            pid: 'pm2:' + proc.pm_id,
            level: (channel == 'err') ? 40 : 30,
            time: new Date(arg.at * 1000).toISOString(),
            msg: JSON.stringify(data || arg),
            v: 0
        };
    };
    obj.pm2 = '[' + proc.name + '-' + proc.pm_id + ' (' + channel + ')]';
    child.stdin.write(JSON.stringify(obj) + '\n');
}

function exit() {
    child.stdin.end();
}


child = spawn('node_modules/.bin/bunyan', get_bunyan_args(), {
    stdio: ['pipe', process.stdout, process.stderr]
});

ipm2.on('ready', function() {
    ipm2.bus.on('log:*', pipe_log);
});

child.stdin.on('close', function() {
    process.exit();
});

child.on('error', function(err) {
    console.error(err);
    process.exit(1);
});

process.on('SIGINT', exit);
process.on('SIGQUIT', exit);
process.on('SIGTERM', exit);
