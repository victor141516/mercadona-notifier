# mercadona-notifier

This is a notifier for [Mercadona job offers](https://mercadona.avature.net/es_ES/Careers/SearchJobs), using Telegram to send notifications

## Usage

```sh
docker run \
  -e TELEGRAM_TOKEN=XXXXXXXXXXXXXXXXXXXXXXX \
  -e TELEGRAM_CHAT_ID=XXXXXXXX \
  -e PROVINCE_ID=345 \ #default
  -e MUNICIPALITY_ID=4875 \ #default
  -e TIMEOUT_SECONDS=300000 \ #default
  victor141516/mercadona-notifier
```

Province and municipality IDs can be obtained checking the URL in the Mercadona page
