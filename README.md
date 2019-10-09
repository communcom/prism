# PRISM-SERVICE

**PRISM-SERVICE** является сервисом дисперсии данных блокчейна CyberWay, которые после вторичной обработки другими
микросервисами могут быть использованы в [golos.io](https://golos.io) и приложениях.

Запуск:

-   Установить `docker` и `docker-compose`
-   Установить необходимые ENV-переменные в `.env` файл (шаблон есть в `.env.example`)
-   Вызвать команду `docker-compose up --build` в корне проекта

API JSON-RPC:

```
search:                            // Поиск по данным из призмы
    type <string>('matchPrefix')   // Тип поиска. Принимает значения "matchPrefix" и "match"
        [
          match                    // Ищет по вхождениям слов. Например, на запрос `app` найдет только `app`
        | matchPrefix              // Ищет по вхождениям частей слов. Например, на запрос `app` найдет и `app`, и `apple`
        ]
    where <string>('all')          // Модель, в которой нужно искать
        [
          all                      // Ищет везде
        | comment                  // Ищет только в комментах
        | post                     // Ищет только в постах
        ]
    text <string>                  // Текст, который требуется найти
    field <string>('all')          // Поле, по которому требуется выполнить поиск
        [
          all                      // Ищет по всем полям
        | title                    // Ищет только в `title` (доступно для `comments` и `posts`)
        | preview                  // Ищет только в `preview` (доступно для `comments` и `posts`)
        | raw                      // Ищет только в `raw` (доступно для `comments` и `posts`)
        | full                     // Ищет только в `full` (доступно для `comments` и `posts`)
        | permlink                 // Ищет только в `permlink` (доступно для `comments` и `posts`)
        ]
    limit <number>(10)             // Ограничение на размер найденных результатов
    offset <number>(0)             // Количество результатов, которое надо "пропустить"

getProfile:                        // Получение профиля пользователя (нужно передать одно из полей):
    userId <string/null>           // Id пользователя
    username <string/null>         // Имя пользователя
    user <string/null>             // userId либо username


getPost:                           // Получение конкретного поста
    userId <string>                // Id пользователя
    permlink <string>              // Пермлинк поста
    communityId <string>           // Идетификатор сообщества, в котором опубликован пост

getComment:                        // Получение конкретного комментария
    userId <string>                // Id пользователя
    communityId <string>           // Id сообщества
    permlink <string>              // Пермлинк комментария

getComments:                       // Получение ленты комментариев
    sortBy <string>('time')        // Способ сортировки
        [
          time                     // Сначала старые, потом новые
        | timeDesc                 // Сначала новые, потом старые
        ]
    offset <number/null>           // Сдвиг
    limit <number>(10)             // Количество элементов
    type <string>('post')          // Тип ленты
        [
          user                     // Получить комментарии пользователя, требует userId
        | post                     // Получить комментарии для поста, требует userId, permlink
        | replies                  // Получить комментарии, которые были оставлены пользователю, требует userId
        ]
    userId <string/null>           // Id пользователя
    permlink <string/null>         // Пермлинк поста
    username <string/null>         // Имя пользователя

getNotifyMeta:                // Получение мета-данных для отображения нотификации
    userId <string>           // Получить данные пользователя по id
    communityId <string>      // Получить данные комьюнити по идентификатору
    postId:                   // Получить данные поста по идентификатору
        userId <string>       // Id пользователя-автора
        permlink <string>     // Пермлинк контента
    commentId:                // Получить данные комментария по идентификатору
        userId <string>       // Id пользователя-автора
        permlink <string>     // Пермлинк контента
    contentId:                // Получить данные поста/комментария по идентификатору
        userId <string>       // Id пользователя-автора
        permlink <string>     // Пермлинк контента

getPostVotes:                 // Получение списка голосов за пост
    sequenceKey <string/null> // Идентификатор пагинации для получения следующего контента
    limit <number>(10)        // Количество элементов
    userId <string>           // Id пользователя
    permlink <string>         // Пермлинк поста
    type <string>             // Тип запрашиваемых голосов
         [
           like               // Лайки
         | dislike            // Дизлайка
         ]

getCommentVotes:              // Получение списка голосов за коммент
    sequenceKey <string/null> // Идентификатор пагинации для получения следующего контента
    limit <number>(10)        // Количество элементов
    userId <string>           // Id пользователя
    permlink <string>         // Пермлинк комментария
    type <string>             // Тип запрашиваемых голосов
         [
           like               // Лайки
         | dislike            // Дизлайка
         ]

resolveProfile:               // Резолв идентификатора пользователя и аватара по имени с доменом
    username <string>         // Имя пользователя

getSubscriptions:                // Получить подписки пользователя
    userId <string>              // Id пользователя
    type <string>('user')        // Тип подписки
        [
          user                   // Подписчики-пользователи
        | community              // Подписчики-сообщества
        ]
    sequenceKey <string/null>    // Идентификатор пагинации для получения следующего контента
    limit <number>(10)           // Количество элементов

getSubscribers:                  // Получить подписчиков пользователя
    userId <string>              // Id пользователя
    type <string>('user')        // Тип подписки
        [
          user                   // Подписчики-пользователи
        | community              // Подписчики-сообщества
        ]
    sequenceKey <string/null>    // Идентификатор пагинации для получения следующего контента
    limit <number>(10)           // Количество элементов

getHashTagTop:                   // Получение топа хеш-тегов
    communityId <string>         // Идентификатор комьюнити
    limit <number>(10)           // Количество элементов
    sequenceKey <string/null>    // Идентификатор пагинации для получения следующего контента

getLeadersTop:                   // Получить топ лидеров
    communityId <string>         // Идентификатор комьюнити
    sequenceKey <string/null>    // Идентификатор пагинации для получения следующего контента
    limit <number>(10)           // Количество элементов
    query <string>               // Префиксный поиск по имени аккаунта

getProposals:                    // Получить список предлагаемых изменений параметров сообществ
    communityId <string>         // Идентификатор комьюнити
    sequenceKey <string/null>    // Идентификатор пагинации для получения следующего контента
    limit <number>(10)           // Количество элементов

getCommunities:
    offset <number>              // Сдвиг пагинации
    limit <number>               // Количество элементов

waitForBlock                     // Дождаться и получить ответ когда призма обработает указанный блок
    blockNum <number>            // Номер блока

waitForTransaction               // Дождаться и получить ответ когда призма обработает указанную транзакцию
    transactionId <string>       // Идентификатор транзакции

```

## Описание API

### getProfile

=> Запрос

```json
{
    "id": "1",
    "method": "getProfile",
    "jsonrpc": "2.0",
    "params": {
        "user": "username",
        "userId": "lol"
    }
}
```

<= Ответ

```json
{
    "jsonrpc": "2.0",
    "id": "1",
    "result": {
        "username": "username",
        "subscriptions": {
            "usersCount": 1,
            "communitiesCount": 0
        },
        "subscribers": {
            "usersCount": 1,
            "communitiesCount": 0
        },
        "stats": {
            "reputation": 0,
            "postsCount": 0,
            "commentsCount": 0
        },
        "leaderIn": [],
        "userId": "tst3vypszqsu",
        "registration": {
            "time": "2019-09-27T11:33:33.000Z"
        },
        "isSubscribed": true,
        "isSubscription": false
    }
}
```

### getCommunity

=> Запрос

```json
{
    "id": "1",
    "method": "getCommunity",
    "jsonrpc": "2.0",
    "params": {
        "communityId": "TWO comunity"
    }
}
```

<= Ответ

```json
{
    "jsonrpc": "2.0",
    "id": "1",
    "result": {
        "subscribersCount": 0,
        "communityId": "TWO comunity",
        "isSubscribed": false
    }
}
```

### getCommunities

=> Запрос

```json
{
    "id": "1",
    "method": "getCommunities",
    "jsonrpc": "2.0",
    "params": {
        "offset": 1,
        "limit": 10
    }
}
```

<= Ответ

```json
{
    "jsonrpc": "2.0",
    "id": "1",
    "result": {
        "communities": [
            {
                "subscribersCount": 0,
                "communityId": "TWO comunity",
                "isSubscribed": false
            }
        ]
    }
}
```

### getPost

=> Запрос

```json
{
    "id": "1",
    "method": "getPost",
    "jsonrpc": "2.0",
    "params": {
        "communityId": "LLUILA",
        "userId": "tst5mwwhngaf",
        "permlink": "hera-fights-with-abderus-against-prometheus-and-common-man-named-mr-delois-hegmanniv-on-new-ghis-1570113941304"
    }
}
```

<= Ответ

```json
{
    "jsonrpc": "2.0",
    "id": "1",
    "result": {
        "content": {
            "type": "basic",
            "body": {
                "attributes": {
                    "type": "basic",
                    "version": "1.0",
                    "title": "Hera fights with Abderus against Prometheus and common man named Mr.Delois HegmannIV on New Ghis"
                },
                "id": 1,
                "type": "post",
                "content": [
                    {
                        "id": 2,
                        "type": "paragraph",
                        "content": [
                            {
                                "id": 3,
                                "type": "text",
                                "content": "Chuck Norris doesn't have performance bottlenecks. He just makes the universe wait its turn.\n at the moment he lives at 4166 Daugherty Wells, New Bariland, PA 70019     \n\n and YODA said: Do. Or do not. There is no try. \n\n witcher quote: You cannot do it. You cannot do it, witcheress. In Kaer Morhen, they taught you to kill, so you kill like a machine. Instinctively. To kill yourself takes character, strength, determination and courage. But that, that they could not teach you. \n\n Rick and Morty quote: Great, now I have to take over an entire planet because of your stupid boobs. \n\n SuperHero Rhino Wolf has power to Levitation and Stealth \n\n Harry Potter quote: Never trust anything that can think for itself if you can't see where it keeps its brain. \n\n and some Lorem to finish text: Qui et est reiciendis quia dolorum exercitationem nulla explicabo et corrupti consequatur voluptas molestiae autem ut reiciendis quis sed qui est commodi doloremque vel pariatur sunt non illum quo eos quis alias qui repudiandae ut sed non distinctio consectetur eveniet eos magnam officia sequi et molestiae enim repudiandae sed delectus error et magnam ratione qui perspiciatis perspiciatis dolore hic adipisci est ut et excepturi ratione temporibus rerum molestiae aut totam eius velit est est aut quasi soluta quia est odio delectus numquam qui rem voluptatem sed quidem asperiores sed id aut sed aspernatur voluptas nostrum eos voluptates natus aut quo sunt at accusamus asperiores dolor voluptatem doloremque ab veritatis ratione tenetur eaque voluptatem distinctio eaque doloribus sequi voluptate hic nostrum vero explicabo exercitationem debitis provident qui natus nemo quasi ut voluptatem quis et voluptatem quasi ut fugit tempore voluptatem qui voluptates neque aut aliquid aperiam ullam similique eaque non consectetur et repellendus illo illo."
                            }
                        ]
                    },
                    {
                        "id": 13,
                        "type": "attachments",
                        "content": [
                            {
                                "id": 14,
                                "type": "image",
                                "content": "https://i.gifer.com/1HOf.gif"
                            }
                        ]
                    }
                ]
            }
        },
        "votes": {
            "upCount": 0,
            "downCount": 0
        },
        "meta": {
            "creationTime": "2019-10-03T14:45:42.000Z"
        },
        "contentId": {
            "userId": "tst5mwwhngaf",
            "permlink": "hera-fights-with-abderus-against-prometheus-and-common-man-named-mr-delois-hegmanniv-on-new-ghis-1570113941304"
        },
        "author": {
            "userId": "tst5mwwhngaf"
        },
        "community": {
            "communityId": "LLUILA",
            "communityName": "LLUILA comunity"
        }
    }
}
```

### getPosts

#### Id-sorted

=> Запрос

```json
{
    "id": "1",
    "method": "getPosts",
    "jsonrpc": "2.0",
    "params": {}
}
```

<= Ответ

```json
{
    "jsonrpc": "2.0",
    "id": "1",
    "result": {
        "items": [
            {
                "content": {
                    "type": "basic",
                    "body": {
                        "attributes": {
                            "type": "basic",
                            "version": "1.0",
                            "title": "Apollo fights with Hercules against Astraeus and common man named Mr.Gary HartmannPhD on New Ghis"
                        },
                        "id": 1,
                        "type": "post",
                        "content": [
                            {
                                "id": 2,
                                "type": "paragraph",
                                "content": [
                                    {
                                        "id": 3,
                                        "type": "text",
                                        "content": "Quantum cryptography does not work on Chuck Norris. When something is being observed by Chuck it stays in the same state until he's finished.\n at the moment he lives at 2727 Tonisha Isle, New Robchester, VA 48056     \n\n and YODA said: Truly wonderful, the mind of a child is. \n\n witcher quote: You get what you get and be happy with it \n\n Rick and Morty quote: Can somebody just let me out of here? If I die in a cage I lose a bet. \n\n SuperHero Illustrious Magneto of Hearts has power to Reality Warping and Magic Resistance \n\n Harry Potter quote: Never trust anything that can think for itself if you can't see where it keeps its brain. \n\n and some Lorem to finish text: Sint architecto alias veniam aut deserunt natus eos eveniet corrupti non eos expedita mollitia explicabo illum corporis ab sit quisquam quod cumque dolorem quae voluptatibus unde et repellendus suscipit qui sequi dolorem quia sed qui ipsum quae commodi dolorem soluta est qui pariatur eos quo hic et quia qui expedita dolorem sit nihil voluptatem voluptas voluptatem hic velit facere et ut neque cum necessitatibus natus est aut excepturi et libero nisi autem consequuntur quisquam repellat incidunt iusto esse perspiciatis accusantium at iure cum illo asperiores quidem voluptates perspiciatis asperiores tempora maxime repellat perferendis consectetur dolorem qui sed quia atque eum unde est hic expedita eos consequatur quo nobis asperiores voluptas est qui unde autem quia id nihil dolorem consequatur rerum eum odit architecto tempora voluptatem ipsa aut aspernatur aut mollitia doloremque earum quod quod maiores sed consequatur perferendis consequatur ut doloremque consequuntur ratione alias commodi repellat non debitis aperiam rem voluptas tempore ducimus."
                                    }
                                ]
                            },
                            {
                                "id": 13,
                                "type": "attachments",
                                "content": [
                                    {
                                        "id": 14,
                                        "type": "website",
                                        "content": "https://www.youtube.com/watch?v=KIJ8MrIR2Gw"
                                    }
                                ]
                            }
                        ]
                    }
                },
                "votes": {
                    "upCount": 0,
                    "downCount": 0
                },
                "meta": {
                    "creationTime": "2019-10-03T14:46:00.000Z"
                },
                "contentId": {
                    "userId": "tst1xerjmnvk",
                    "permlink": "apollo-fights-with-hercules-against-astraeus-and-common-man-named-mr-gary-hartmannphd-on-new-ghis-1570113958722"
                },
                "author": {
                    "userId": "tst1xerjmnvk"
                },
                "community": {
                    "communityId": "LLUPLO",
                    "communityName": null,
                    "avatarUrl": null
                }
            },
            {
                "content": {
                    "type": "basic",
                    "body": {
                        "attributes": {
                            "type": "basic",
                            "version": "1.0",
                            "title": "Hera fights with Abderus against Prometheus and common man named Mr.Delois HegmannIV on New Ghis"
                        },
                        "id": 1,
                        "type": "post",
                        "content": [
                            {
                                "id": 2,
                                "type": "paragraph",
                                "content": [
                                    {
                                        "id": 3,
                                        "type": "text",
                                        "content": "Chuck Norris doesn't have performance bottlenecks. He just makes the universe wait its turn.\n at the moment he lives at 4166 Daugherty Wells, New Bariland, PA 70019     \n\n and YODA said: Do. Or do not. There is no try. \n\n witcher quote: You cannot do it. You cannot do it, witcheress. In Kaer Morhen, they taught you to kill, so you kill like a machine. Instinctively. To kill yourself takes character, strength, determination and courage. But that, that they could not teach you. \n\n Rick and Morty quote: Great, now I have to take over an entire planet because of your stupid boobs. \n\n SuperHero Rhino Wolf has power to Levitation and Stealth \n\n Harry Potter quote: Never trust anything that can think for itself if you can't see where it keeps its brain. \n\n and some Lorem to finish text: Qui et est reiciendis quia dolorum exercitationem nulla explicabo et corrupti consequatur voluptas molestiae autem ut reiciendis quis sed qui est commodi doloremque vel pariatur sunt non illum quo eos quis alias qui repudiandae ut sed non distinctio consectetur eveniet eos magnam officia sequi et molestiae enim repudiandae sed delectus error et magnam ratione qui perspiciatis perspiciatis dolore hic adipisci est ut et excepturi ratione temporibus rerum molestiae aut totam eius velit est est aut quasi soluta quia est odio delectus numquam qui rem voluptatem sed quidem asperiores sed id aut sed aspernatur voluptas nostrum eos voluptates natus aut quo sunt at accusamus asperiores dolor voluptatem doloremque ab veritatis ratione tenetur eaque voluptatem distinctio eaque doloribus sequi voluptate hic nostrum vero explicabo exercitationem debitis provident qui natus nemo quasi ut voluptatem quis et voluptatem quasi ut fugit tempore voluptatem qui voluptates neque aut aliquid aperiam ullam similique eaque non consectetur et repellendus illo illo."
                                    }
                                ]
                            },
                            {
                                "id": 13,
                                "type": "attachments",
                                "content": [
                                    {
                                        "id": 14,
                                        "type": "image",
                                        "content": "https://i.gifer.com/1HOf.gif"
                                    }
                                ]
                            }
                        ]
                    }
                },
                "votes": {
                    "upCount": 0,
                    "downCount": 0
                },
                "meta": {
                    "creationTime": "2019-10-03T14:45:45.000Z"
                },
                "contentId": {
                    "userId": "tst2lcmzfgyh",
                    "permlink": "hera-fights-with-abderus-against-prometheus-and-common-man-named-mr-delois-hegmanniv-on-new-ghis-1570113941304"
                },
                "author": {
                    "userId": "tst2lcmzfgyh"
                },
                "community": {
                    "communityId": "LLUILA",
                    "communityName": null,
                    "avatarUrl": null
                }
            },
            {
                "content": {
                    "type": "basic",
                    "body": {
                        "attributes": {
                            "type": "basic",
                            "version": "1.0",
                            "title": "Hera fights with Abderus against Prometheus and common man named Mr.Delois HegmannIV on New Ghis"
                        },
                        "id": 1,
                        "type": "post",
                        "content": [
                            {
                                "id": 2,
                                "type": "paragraph",
                                "content": [
                                    {
                                        "id": 3,
                                        "type": "text",
                                        "content": "Chuck Norris doesn't have performance bottlenecks. He just makes the universe wait its turn.\n at the moment he lives at 4166 Daugherty Wells, New Bariland, PA 70019     \n\n and YODA said: Do. Or do not. There is no try. \n\n witcher quote: You cannot do it. You cannot do it, witcheress. In Kaer Morhen, they taught you to kill, so you kill like a machine. Instinctively. To kill yourself takes character, strength, determination and courage. But that, that they could not teach you. \n\n Rick and Morty quote: Great, now I have to take over an entire planet because of your stupid boobs. \n\n SuperHero Rhino Wolf has power to Levitation and Stealth \n\n Harry Potter quote: Never trust anything that can think for itself if you can't see where it keeps its brain. \n\n and some Lorem to finish text: Qui et est reiciendis quia dolorum exercitationem nulla explicabo et corrupti consequatur voluptas molestiae autem ut reiciendis quis sed qui est commodi doloremque vel pariatur sunt non illum quo eos quis alias qui repudiandae ut sed non distinctio consectetur eveniet eos magnam officia sequi et molestiae enim repudiandae sed delectus error et magnam ratione qui perspiciatis perspiciatis dolore hic adipisci est ut et excepturi ratione temporibus rerum molestiae aut totam eius velit est est aut quasi soluta quia est odio delectus numquam qui rem voluptatem sed quidem asperiores sed id aut sed aspernatur voluptas nostrum eos voluptates natus aut quo sunt at accusamus asperiores dolor voluptatem doloremque ab veritatis ratione tenetur eaque voluptatem distinctio eaque doloribus sequi voluptate hic nostrum vero explicabo exercitationem debitis provident qui natus nemo quasi ut voluptatem quis et voluptatem quasi ut fugit tempore voluptatem qui voluptates neque aut aliquid aperiam ullam similique eaque non consectetur et repellendus illo illo."
                                    }
                                ]
                            },
                            {
                                "id": 13,
                                "type": "attachments",
                                "content": [
                                    {
                                        "id": 14,
                                        "type": "image",
                                        "content": "https://i.gifer.com/1HOf.gif"
                                    }
                                ]
                            }
                        ]
                    }
                },
                "votes": {
                    "upCount": 0,
                    "downCount": 0
                },
                "meta": {
                    "creationTime": "2019-10-03T14:45:42.000Z"
                },
                "contentId": {
                    "userId": "tst5mwwhngaf",
                    "permlink": "hera-fights-with-abderus-against-prometheus-and-common-man-named-mr-delois-hegmanniv-on-new-ghis-1570113941304"
                },
                "author": {
                    "userId": "tst5mwwhngaf"
                },
                "community": {
                    "communityId": "LLUILA",
                    "communityName": null,
                    "avatarUrl": null
                }
            }
        ]
    }
}
```

### getComment

=> Запрос

```json
{
    "id": "1",
    "method": "getComment",
    "jsonrpc": "2.0",
    "params": {
        "userId": "tst2fxgvjzkf",
        "permlink": "hermes-fights-with-ajax-against-rhea-and-common-man-named-ms-david-hoppe-ivmd-on-asshai-1570275616566",
        "communityId": "ETE"
    }
}
```

<= Ответ

```json
{
    "jsonrpc": "2.0",
    "id": "1",
    "result": {
        "parents": {
            "post": {
                "userId": "tst2qlxxtbcw",
                "permlink": "apollo-fights-with-dana-against-oceanus-and-common-man-named-dr-johnetta-wizadds-on-volantis-1570275616221"
            }
        },
        "votes": {
            "upCount": 0,
            "downCount": 0
        },
        "meta": {
            "creationTime": "2019-10-05T11:40:18.000Z"
        },
        "communityId": "ETE",
        "contentId": {
            "userId": "tst2fxgvjzkf",
            "permlink": "hermes-fights-with-ajax-against-rhea-and-common-man-named-ms-david-hoppe-ivmd-on-asshai-1570275616566"
        },
        "content": {
            "body": {
                "attributes": {
                    "type": "comment",
                    "version": "1.0",
                    "title": "Hermes fights with Ajax against Rhea and common man named Ms.David Hoppe IVMD on Asshai"
                },
                "id": 1,
                "type": "post",
                "content": [
                    {
                        "id": 2,
                        "type": "paragraph",
                        "content": [
                            {
                                "id": 3,
                                "type": "text",
                                "content": "Chuck Norris' addition operator doesn't commute; it teleports to where he needs it to be.\n at the moment he lives at Suite 207 2556 Yesenia Dale, West Gordon, GA 31819-8803     \n\n and YODA said: Adventure. Excitement. A Jedi craves not these things. \n\n witcher quote: The sword of destiny has two edges. You are one of them. \n\n Rick and Morty quote: Hello Jerry, come to rub my face in urine again? \n\n SuperHero Doc Samson has power to Reflexes and Human physical perfection \n\n Harry Potter quote: It is the unknown we fear when we look upon death and darkness, nothing more. \n\n and some Lorem to finish text: Distinctio earum autem quia tempora minus ut ab odit rerum sed sed earum vel esse soluta perspiciatis sunt et non hic officia eum consequuntur laborum libero soluta maiores tempora et ut quaerat velit ipsa aut cupiditate veritatis voluptas dolorem et rem possimus et accusamus modi amet tenetur voluptatem velit perferendis quia non quod ea ullam omnis dolorem et ut molestias praesentium illum voluptates qui amet voluptas earum quia sed magni facilis consequatur aliquam necessitatibus aspernatur fugit aliquid a amet provident id repellat quis nesciunt sapiente consectetur quia et id nihil pariatur illo et suscipit ullam vel alias ut repellendus beatae voluptatum quia et cum aperiam pariatur quam accusamus expedita odit omnis quia delectus explicabo rem est incidunt et accusamus ratione a vitae ab officiis architecto rerum et corrupti debitis laboriosam ut nihil necessitatibus eaque voluptatem quia vel rerum cupiditate cumque voluptatem impedit omnis tempora aut ut quisquam aliquid optio consequatur placeat fugit."
                            }
                        ]
                    },
                    {
                        "id": 13,
                        "type": "attachments",
                        "content": [
                            {
                                "id": 14,
                                "type": "website",
                                "content": "https://bash.im/"
                            }
                        ]
                    }
                ]
            }
        },
        "author": {
            "userId": "tst2fxgvjzkf",
            "username": "predovic-bailey-dds",
            "avatarUrl": "https://i.pravatar.cc/300?u=4a70ae36926fb12b9cff57731434d45cdf3680cb"
        },
        "community": {
            "communityId": "ETE",
            "communityName": "ETE comunity",
            "avatarUrl": "https://i.pravatar.cc/300?u=4a70ae36926fb12b9cff57731434d45cdf3680cb"
        }
    }
}
```

Возможные переменные окружения `ENV`:

-   `GLS_CONNECTOR_HOST` _(обязательно)_ - адрес, который будет использован для входящих подключений связи микросервисов.  
    Дефолтное значение - `127.0.0.1`

-   `GLS_CONNECTOR_PORT` _(обязательно)_ - адрес порта, который будет использован для входящих подключений связи микросервисов.  
    Дефолтное значение - `3000`

-   `GLS_METRICS_HOST` _(обязательно)_ - адрес хоста для метрик StatsD.  
    Дефолтное значение - `127.0.0.1`

-   `GLS_METRICS_PORT` _(обязательно)_ - адрес порта для метрик StatsD.  
    Дефолтное значение - `8125`

-   `GLS_MONGO_CONNECT` - строка подключения к базе MongoDB.  
    Дефолтное значение - `mongodb://mongo/admin`

-   `GLS_DAY_START` - время начала нового дня в часах относительно UTC.  
    Дефолтное значение - `3` (день начинается в 00:00 по Москве)

-   `GLS_MAX_FEED_LIMIT` - максимальное количество постов отдаваемое в ленту на 1 запрос за 1 раз.  
    Дефолтное значение - `100`

-   `GLS_FEED_CACHE_INTERVAL` - интервал перерассчета кешей для кешируемых типов лент (но полное удаление старого происходит по `GLS_FEED_CACHE_TTL`).  
    Дефолтное значение - `300000` _(5 минут)_

-   `GLS_FEED_CACHE_TTL` - время жизни каждого кеша ленты.  
    Дефолтное значение - `28800000` _(8 часов)_

-   `GLS_FEED_CACHE_MAX_ITEMS` - максимальное количество элементов, кешированных для каждого типа ленты.
    Дефолтное значение - `10000` _(10 000)_

-   `GLS_FACADE_CONNECT` _(обязательно)_ - адрес подключения к микросервису фасаду.

-   `GLS_META_CONNECT` _(обязательно)_ - адрес подключения к микросервису мета.

-   `GLS_MAX_HASH_TAG_SIZE` - максимальный размер хеш-тега для контента.  
    Дефолтное значение - `32`

-   `GLS_RECENT_TRANSACTION_ID_TTL` - интервал хранения идентификаторов обработанных транзакций.  
    Дефолтное значение - `180000` _(3 минуты)_

-   `GLS_MAX_WAIT_FOR_BLOCKCHAIN_TIMEOUT` - максимальное время, которое может ждать `waitForBlock` и подобные методы API.  
    Дефолтное значение - `20000` _(20 секунд)_

-   `GLS_SEARCH_SYNC_TIMEOUT` - интеравал синхронизации новых записей в призме с поисковым индексом.
    Дефолтное значение - `1000` _(1 секунда)_

-   `GLS_SEARCH_DELETE_TIMEOUT` - интеравал синхронизации удаленных записей из призмы с поисковым индексом.
    Дефолтное значение - `3600000` _(1 час)_

-   `GLS_SEARCH_CONNECTION_STRING` _(обязательно)_ - строка подключения к поисковому индексу

-   `GLS_SEARCH_ENABLED` - определяет, должно ли происходить индексирование для полнотекстого поиска.
    Дефолтное значение - `true`

-   `GLS_USE_GENESIS` - необходимо ли ожидать загрузки генезис-данных.  
    Дефолтное значение - `true`

-   `GLS_MAX_QUERY_MEMORY_LIMIT` - лимит памяти для одного запроса, критично для системы кеширования.  
    Дефолтное значение - `536870912` _(512 Мб)_

-   `GLS_ENABLE_BLOCK_HANDLE` - включает сбор данных из блокчейна, а также апи ожидания транзакций.  
    Дефолтное значение - `true`

-   `GLS_ENABLE_PUBLIC_API` - включает выдачу данных по публичному апи, за исключением апи ожидания транзакций.  
    Дефолтное значение - `true`

-   `GLS_BLOCKCHAIN_BROADCASTER_SERVER_NAME` - имя сервера рассыльщика блоков.

-   `GLS_BLOCKCHAIN_BROADCASTER_CLIENT_NAME` - имя клиента для подключения к рассыльщику блоков.

-   `GLS_BLOCKCHAIN_BROADCASTER_CONNECT` - строка подключения к рассыльщику блоков, может содержать авторизацию.
