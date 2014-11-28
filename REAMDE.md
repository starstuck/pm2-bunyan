pm2-bunyan
==========

Small utility which collects pm2 logs and filters them through bunyan. Native bunyan messages are passed as they are.

Sample usage

    pm2-bunyan -c this.name.match(/^my_app:/) -l info
