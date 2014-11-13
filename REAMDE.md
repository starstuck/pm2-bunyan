pm2-bunyan
==========

Small utility which collects pm2 logs and wraps them in bunyan json format. Bunyan messages are passed through.

Sample usage

    pm2-bunyan | bunyan -c this.level >= 30
