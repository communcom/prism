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
    
getPosts:                          // Получение ленты по определенному принципу
    userId <string>                // Id пользователя
    communityId <string>           // Идетификатор сообщества
    allowNsfw <boolean>(false)     // Разрешать выдачу NSFW-контента
    type <string>('community')     // Тип ленты
        [
          community                // Лента сообщества
        | subscriptions            // Лента пользователя по подпискам
        | byUser                   // Лента постов с авторством пользователя
        ]
    sortBy <string>('time')        // Тип ленты
        [
          time                     // Сортировка по времени (от новых к старым)
        | timeDesc                 // Обратная сортировка по времени (от старых к новым)
        | popular                  // Сортировка по популярности (сначала популярное)
        ]    
    limit <number>(10)             // Ограничение на размер найденных результатов
    offset <number>(0)             // Количество результатов, которое надо "пропустить"

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
        | post                     // Получить комментарии для поста или родительского комментария. Если у комменария вложенности 1 менее 5 детей, они также участвуют в выдаче
        | replies                  // Получить комментарии, которые были оставлены пользователю, требует userId
        ]
    userId <string/null>           // Id пользователя
    permlink <string/null>         // Пермлинк поста
    communityId <string/null>      // Id сообщества
    communityAlias <string/null>   // Alias сообщества (замена communityId при необходимости)
    parentComment: <object/null>   // userId и permlink родительского комментария (при необходимости получить ответы на этот комментарий)

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
    offset <number>(0)           // Кол-во записей, которые следует пропустить
    limit <number>(10)           // Количество элементов

getSubscribers:                  // Получить подписчиков пользователя или сообщества (в зависимости от переданных параметров)
    userId <string>              // Идентификатор пользователя
    communityId <string>         // Идентификатор сообщества
    offset <number>(0)           // Кол-во записей, которые следует пропустить
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
    "id": 1,
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
    "id": 1,
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
    "id": 1,
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
    "id": 1,
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
    "id": 1,
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
    "id": 1,
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
    "id": 1,
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
    "id": 1,
    "result": {
        "content": {
            "type": "article",
            "body": {
                "attributes": {
                    "type": "article",
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
                        "id": 4,
                        "type": "image",
                        "content": "https://i.gifer.com/1HOf.gif"
                    }
                ]
            }
        },
        "votes": {
            "upCount": 0,
            "downCount": 0,
            "hasUpVote": false,
            "hasDownVote": false
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
            "name": "LLUILA comunity"
        }
    }
}
```

### getPosts

#### Id-sorted

=> Запрос

```json
{
    "id": 1,
    "method": "getPosts",
    "jsonrpc": "2.0",
    "params": {}
}
```

<= Ответ

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
        "items": [
            {
                "content": {
                    "type": "basic",
                    "body": {
                        "attributes": {
                            "type": "basic",
                            "version": "1.0"
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
                    "downCount": 0,
                    "hasUpVote": false,
                    "hasDownVote": false
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
                    "name": null,
                    "avatarUrl": null
                }
            },
            {
                "content": {
                    "type": "basic",
                    "body": {
                        "attributes": {
                            "type": "basic",
                            "version": "1.0"
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
                    "downCount": 0,
                    "hasUpVote": false,
                    "hasDownVote": false
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
                    "name": null,
                    "avatarUrl": null
                }
            },
            {
                "content": {
                    "type": "basic",
                    "body": {
                        "attributes": {
                            "type": "basic",
                            "version": "1.0"
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
                    "downCount": 0,
                    "hasUpVote": false,
                    "hasDownVote": false
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
                    "name": null,
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
            "username": "predovic-bailey-dds"
        },
        "community": {
            "communityId": "ETE",
            "communityName": "ETE comunity",
            "avatarUrl": "https://i.pravatar.cc/300?u=4a70ae36926fb12b9cff57731434d45cdf3680cb"
        },
        "isSubscribedAuthor": false,
        "isSubscribedCommunity": false
    }
}
```

#### Timeline by user

Посты пользователя сортированные по времени

=> Запрос

```json
{
    "id": 1,
    "method": "getPosts",
    "jsonrpc": "2.0",
    "params": {
        "userId": "tst1koocxwbz",
        "type": "byUser",
        "allowNsfw": true
    }
}
```

<= Ответ

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
        "items": [
            {
                "content": {
                    "type": "basic",
                    "body": {
                        "attributes": {
                            "type": "basic",
                            "version": "1.0"
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
                                        "content": "Chuck Norris went out of an infinite loop.\n at the moment he lives at 357 Andree Junction, Johnstonburgh, RI 56523-9571     \n\n and YODA said: Adventure. Excitement. A Jedi craves not these things. \n\n witcher quote: What is truth? The negation of lies? Or the statement of a fact? And if the fact is a lie, what then is the truth? \n\n Rick and Morty quote: You're our boy dog, don't even trip. \n\n SuperHero Yellowjacket X has power to Intelligence and Sonar \n\n Harry Potter quote: If you want to know what a man’s like, take a good look at how he treats his inferiors, not his equals. \n\n and some Lorem to finish text: Expedita beatae enim est possimus ut inventore consectetur rerum aliquid praesentium fugit qui velit enim cumque unde ut dolor in voluptas voluptates enim maxime vitae qui sit cum qui enim officia dicta repudiandae sed deserunt exercitationem odit et suscipit unde maiores est facilis aliquam sed sed veritatis velit deleniti qui placeat praesentium porro neque repellendus autem deserunt numquam non sint deleniti rerum esse laboriosam magnam et blanditiis eos dignissimos eos et earum et aut fuga eaque dignissimos maiores fuga ea magnam minus odio ad tempore omnis dolor fugiat maxime tenetur impedit quae id voluptatum voluptatem libero est ut iure qui architecto iste aut vel odio et quisquam ut et est consequatur incidunt sequi in et veritatis reprehenderit aut culpa voluptas ducimus veniam culpa veniam repellat fugiat magni earum repellendus quisquam et amet consequatur illum doloremque rerum voluptatum vero perspiciatis rerum quo illo rerum repellat dolores et adipisci earum in quia esse."
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
                    "downCount": 0,
                    "hasUpVote": false,
                    "hasDownVote": false
                },
                "stats": {
                    "commentsCount": 0
                },
                "meta": {
                    "creationTime": "2019-10-09T11:52:30.000Z"
                },
                "contentId": {
                    "userId": "tst1koocxwbz",
                    "permlink": "demeter-fights-with-andromeda-against-coeus-and-common-man-named-mrs-julissa-tillmaniii-on-sar-meel-1570621947245"
                },
                "author": {
                    "userId": "tst1koocxwbz",
                    "username": "boehm-garland-md",
                    "avatarUrl": "https://i.pravatar.cc/300?u=86a9be2732fb54fccdb294e555cab54fc5f7c729"
                },
                "community": {
                    "communityId": "WWAPUPO",
                    "alias": "id1377443613",
                    "name": "WWAPUPO comunity",
                    "avatarUrl": "https://i.pravatar.cc/300?u=7a180c543a5ce7adb504de330105542daece71f"
                },
                "isSubscribedAuthor": false,
                "isSubscribedCommunity": false
            }
        ]
    }
}
```

### getComment

=> Запрос

```json
{
    "id": 1,
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
    "id": 1,
    "result": {
        "parents": {
            "post": {
                "userId": "tst2qlxxtbcw",
                "permlink": "apollo-fights-with-dana-against-oceanus-and-common-man-named-dr-johnetta-wizadds-on-volantis-1570275616221"
            }
        },
        "votes": {
            "upCount": 0,
            "downCount": 0,
            "hasUpVote": false,
            "hasDownVote": false
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
            "name": "ETE comunity",
            "avatarUrl": "https://i.pravatar.cc/300?u=4a70ae36926fb12b9cff57731434d45cdf3680cb"
        }
    }
}
```

### getSubscriptions

=> Запрос подписок-пользователей

```json
{
    "id": 1,
    "method": "getSubscriptions",
    "jsonrpc": "2.0",
    "params": {
    	"type": "user",
        "userId": "tst3fwejlkvx"
    }
}
```

<= Ответ

В случае, если пользователь авторизован, в объектах массива `items` будет дополнительное поле `isSubscribed` со значением типа Boolean

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
        "items": [
            {
                "userId": "tst2hjvcmdnt",
                "username": "daniel-dwight-dvm",
                "avatarUrl": "https://i.pravatar.cc/300?u=fa7b2527200945ab3b8598162adf72a643869b52"
            },
            {
                "userId": "tst1vowhrctw",
                "username": "leannon-hollis-dvm",
                "avatarUrl": "https://i.pravatar.cc/300?u=2e80800aa10707cd140cd2b6e1c64b1c34b9b2f9"
            }
        ]
    }
}
```

=> Запрос подписок-сообществ

```json
{
    "id": 1,
    "method": "getSubscriptions",
    "jsonrpc": "2.0",
    "params": {
    	"type": "community",
        "userId": "tst3fwejlkvx"
    }
}
```

<= Ответ

В случае, если пользователь авторизован, в объектах массива `items` будет дополнительное поле `isSubscribed` со значением типа Boolean

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
        "items": [
            {
                "communityId": "id2507527990",
                "name": "cats",
                "code": "CATS"
            }
        ]
    }
}
```

### getSubscribers

=> Запрос подписчиков сообщества

```json
{
    "id": 1,
    "method": "getSubscribers",
    "jsonrpc": "2.0",
    "params": {
        "communityId": "id2507527990"
    }
}
```

<= Ответ

В случае, если пользователь авторизован, в объектах массива `items` будет дополнительное поле `isSubscribed` со значением типа Boolean

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
        "items": [
            {
                "userId": "tst3fwejlkvx",
                "username": "heidenreich-odessa-v",
                "avatarUrl": "https://i.pravatar.cc/300?u=e8f13335de09997afb44b808a2fdada046016d92"
            }
        ]
    }
}
```

=> Запрос подписчиков пользователя

```json
{
    "id": 1,
    "method": "getSubscribers",
    "jsonrpc": "2.0",
    "params": {
        "userId": "tst1vowhrctw"
    }
}
```

<= Ответ

В случае, если пользователь авторизован, в объектах массива `items` будет дополнительное поле `isSubscribed` со значением типа Boolean

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
        "items": [
            {
                "userId": "tst3fwejlkvx",
                "username": "heidenreich-odessa-v",
                "avatarUrl": "https://i.pravatar.cc/300?u=e8f13335de09997afb44b808a2fdada046016d92"
            },
            {
                "userId": "tst2hjvcmdnt",
                "username": "daniel-dwight-dvm",
                "avatarUrl": "https://i.pravatar.cc/300?u=fa7b2527200945ab3b8598162adf72a643869b52"
            }
        ]
    }
}
```

### getComments

=> Запрос комментариев к посту

```json
{
    "id": 1,
    "method": "getComments",
    "jsonrpc": "2.0",
    "params": {
        "communityId": "WWAPEPA",
        "userId": "tst1zfzkzodb",
        "permlink": "hestia-fights-with-medea-against-helios-and-common-man-named-mr-august-leffler-iiii-on-yunkai-1570622466236"
    }
}
```

<= Ответ

У комментариев к посту менее пяти вложенных комментариев, поэтому они включены в выдачу

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
        "items": [
            {
                "votes": {
                    "upCount": 0,
                    "downCount": 0,
                    "hasUpVote": false,
                    "hasDownVote": false
                },
                "meta": {
                    "creationTime": "2019-10-09T12:01:12.000Z"
                },
                "childCommentsCount": 1,
                "contentId": {
                    "communityId": "WWAPEPA",
                    "userId": "tst3xtckjyrn",
                    "permlink": "zeus-fights-with-icarus-against-eurynome-and-common-man-named-mr-kaylee-hudsoni-on-pentos-1570622469320"
                },
                "parents": {
                    "post": {
                        "communityId": "WWAPEPA",
                        "userId": "tst1zfzkzodb",
                        "permlink": "hestia-fights-with-medea-against-helios-and-common-man-named-mr-august-leffler-iiii-on-yunkai-1570622466236"
                    },
                    "comment": null
                },
                "content": {
                    "body": {
                        "attributes": {
                            "type": "comment",
                            "version": "1.0",
                            "title": "Zeus fights with Icarus against Eurynome and common man named Mr.Kaylee HudsonI on Pentos"
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
                                        "content": "Chuck Norris can write multi-threaded applications with a single thread.\n at the moment he lives at 4607 Lino Lights, Dillonberg, MT 46961     \n\n and YODA said: Do. Or do not. There is no try. \n\n witcher quote: When you know about something it stops being a nightmare. When you know how to fight something, it stops being so threatening. \n\n Rick and Morty quote: The first rule of space travel kids is always check out distress beacons. Nine out of ten times it's a ship full of dead aliens and a bunch of free shit! One out of ten times it's a deadly trap, but... I'm ready to roll those dice! \n\n SuperHero Agent Mimic XI has power to Intangibility and Magic \n\n Harry Potter quote: There are some things you can't share without ending up liking each other, and knocking out a twelve-foot mountain troll is one of them. \n\n and some Lorem to finish text: Iure et eligendi rerum minus quia cumque odit tenetur adipisci quibusdam sit quos nam sit nobis eos voluptatibus et neque molestias officia consequatur error deleniti officia quos molestias ut ut ut quo ut est alias temporibus quia ut nobis non placeat eius consectetur velit voluptatem accusantium velit quisquam inventore voluptas porro in nesciunt nisi officia sit est voluptatibus ut molestiae perferendis blanditiis odit molestiae a sunt alias aut adipisci et maxime et aut repellendus voluptatem voluptate molestiae optio voluptate non culpa velit alias aliquam ut enim qui doloribus quis ut iste iusto quia natus deleniti et quae ipsam maiores nisi quisquam id quasi beatae nisi enim qui quam minima voluptatum qui incidunt dicta rerum id ad et est vel in incidunt vero numquam modi ut doloremque eum nisi reprehenderit possimus ab sint nobis animi maiores labore adipisci accusamus soluta dolores atque deleniti quo dicta ea odit et facilis provident tenetur."
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
                "author": {
                    "userId": "tst3xtckjyrn",
                    "username": "von-chi-iv",
                    "avatarUrl": "https://i.pravatar.cc/300?u=fa98c7309783247e76d30664dbb5441dddc7b006",
                    "isSubscribed": false
                },
                "community": {
                    "communityId": "WWAPEPA",
                    "alias": "id4197175299",
                    "name": "WWAPEPA comunity",
                    "avatarUrl": "https://i.pravatar.cc/300?u=4533b2fcfd06fdf86b990e9e99f3f6bfc67824b0",
                    "isSubscribed": false
                },
                "children": [
                    {
                        "votes": {
                            "upCount": 0,
                            "downCount": 0,
                            "hasUpVote": false,
                            "hasDownVote": false
                        },
                        "meta": {
                            "creationTime": "2019-10-09T12:01:12.000Z"
                        },
                        "childCommentsCount": 1,
                        "contentId": {
                            "communityId": "WWAPEPA",
                            "userId": "tst4zkborxrl",
                            "permlink": "zeus-fights-with-hercules-against-perses-and-common-man-named-mrs-chong-reicherti-on-qarth-1570622469887"
                        },
                        "parents": {
                            "post": {
                                "communityId": "WWAPEPA",
                                "userId": "tst1zfzkzodb",
                                "permlink": "hestia-fights-with-medea-against-helios-and-common-man-named-mr-august-leffler-iiii-on-yunkai-1570622466236"
                            },
                            "comment": {
                                "communityId": "WWAPEPA",
                                "userId": "tst3xtckjyrn",
                                "permlink": "zeus-fights-with-icarus-against-eurynome-and-common-man-named-mr-kaylee-hudsoni-on-pentos-1570622469320"
                            }
                        },
                        "content": {
                            "body": {
                                "attributes": {
                                    "type": "comment",
                                    "version": "1.0",
                                    "title": "Zeus fights with Hercules against Perses and common man named Mrs.Chong ReichertI on Qarth"
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
                                                "content": "Quantum cryptography does not work on Chuck Norris. When something is being observed by Chuck it stays in the same state until he's finished.\n at the moment he lives at Apt. 337 00918 Mann Path, Lake Grover, KS 09747     \n\n and YODA said: Adventure. Excitement. A Jedi craves not these things. \n\n witcher quote: I'll stick me boot so far up yer arse your tongue'll taste like wench twat \n\n Rick and Morty quote: Keep Summer safe. \n\n SuperHero Goblin Queen has power to Symbiote Costume and Melting \n\n Harry Potter quote: I solemnly swear that I am up to no good. \n\n and some Lorem to finish text: Architecto neque ab nesciunt quod ea qui eaque vitae voluptatem quasi ex expedita rerum hic qui et numquam ipsam illum non sint possimus et ipsum reiciendis sed enim laudantium beatae qui aut doloribus atque non earum cumque at aperiam recusandae dignissimos facilis dolorem dolores pariatur non deleniti est accusamus adipisci laboriosam fugit ullam porro nobis assumenda deserunt aperiam quo libero eligendi nam molestiae est repudiandae nulla unde delectus vel consequatur impedit blanditiis est quia ut officia dolorem consequatur laudantium in et fugit qui autem quia repudiandae cum repudiandae dolor vel labore sunt minus qui quibusdam eligendi rerum qui tempora explicabo consequuntur sed est quam dolor quo non dolores dolores inventore sapiente praesentium ullam molestias adipisci doloremque in vitae sit aperiam facere natus corporis amet temporibus doloribus eos et aut fugiat sunt esse illo vero enim sed dignissimos dolorem perspiciatis qui consequuntur sed exercitationem sint esse saepe nobis facilis sint aut libero eum sit eligendi aspernatur."
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
                        "author": {
                            "userId": "tst4zkborxrl",
                            "username": "bartoletti-cassi-jr",
                            "avatarUrl": "https://i.pravatar.cc/300?u=e616310912d3222b9f50a2a1a5bbf87e8c07ae76",
                            "isSubscribed": false
                        },
                        "community": {
                            "communityId": "WWAPEPA",
                            "alias": "id4197175299",
                            "name": "WWAPEPA comunity",
                            "avatarUrl": "https://i.pravatar.cc/300?u=4533b2fcfd06fdf86b990e9e99f3f6bfc67824b0",
                            "isSubscribed": false
                        }
                    }
                ]
            },
            {
                "votes": {
                    "upCount": 0,
                    "downCount": 0,
                    "hasUpVote": false,
                    "hasDownVote": false
                },
                "meta": {
                    "creationTime": "2019-10-09T12:01:09.000Z"
                },
                "childCommentsCount": 0,
                "contentId": {
                    "communityId": "WWAPEPA",
                    "userId": "tst2fdikvpfh",
                    "permlink": "artemis-fights-with-dana-against-theia-and-common-man-named-misshunter-oberbrunneri-on-lannisport-1570622468592"
                },
                "parents": {
                    "post": {
                        "communityId": "WWAPEPA",
                        "userId": "tst1zfzkzodb",
                        "permlink": "hestia-fights-with-medea-against-helios-and-common-man-named-mr-august-leffler-iiii-on-yunkai-1570622466236"
                    },
                    "comment": null
                },
                "content": {
                    "body": {
                        "attributes": {
                            "type": "comment",
                            "version": "1.0",
                            "title": "Artemis fights with Danaë against Theia and common man named MissHunter OberbrunnerI on Lannisport"
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
                                        "content": "Chuck Norris doesn't pair program.\n at the moment he lives at 028 Kihn Oval, Evangelineburgh, NC 38472     \n\n and YODA said: Pain, suffering, death I feel. Something terrible has happened. Young Skywalker is in pain. Terrible pain \n\n witcher quote: No one wants to suffer. But that is the fate of each. And some suffer more. Not necessarily of their own volition. It's not about to enduring the suffering. It's about how you endure it. \n\n Rick and Morty quote: Existence is pain to a meeseeks Jerry, and we will do anything to alleviate that pain. \n\n SuperHero Lizard Ivy has power to Immortality and Elemental Transmogrification \n\n Harry Potter quote: Of course it is happening inside your head, Harry, but why on earth should that mean that it is not real? \n\n and some Lorem to finish text: Ab dolor laboriosam voluptas ad nam repellendus aliquam qui animi eaque adipisci id sequi quis dolorem occaecati aspernatur ducimus sunt voluptatum qui quasi excepturi ipsum culpa quo itaque sint nobis minus labore recusandae ea cumque unde quos quisquam totam porro commodi amet qui voluptatum quae suscipit qui doloribus omnis eum nihil aperiam iusto ut qui occaecati eligendi accusamus excepturi minima facilis eum quisquam molestiae et id officia magni fugiat qui dolorum quidem ducimus quisquam incidunt dolorum reiciendis reiciendis accusamus ipsa id itaque voluptatum neque sunt voluptas in sint dolorum eum modi ratione molestiae facilis sed accusantium assumenda ea hic ea ut porro modi dolor quia autem iure maxime atque omnis saepe itaque perferendis suscipit et cumque distinctio magni ut ea rerum architecto non voluptas amet nostrum aperiam qui eligendi doloribus incidunt fuga id fuga enim explicabo repellat aliquam nam voluptatibus cupiditate sed doloremque adipisci delectus saepe sapiente repudiandae temporibus molestiae consequatur quas."
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
                    "userId": "tst2fdikvpfh",
                    "username": "swift-donald-dds",
                    "avatarUrl": "https://i.pravatar.cc/300?u=777533b3b7583a0e764ef4ed5266f0a3fd161b0e",
                    "isSubscribed": false
                },
                "community": {
                    "communityId": "WWAPEPA",
                    "alias": "id4197175299",
                    "name": "WWAPEPA comunity",
                    "avatarUrl": "https://i.pravatar.cc/300?u=4533b2fcfd06fdf86b990e9e99f3f6bfc67824b0",
                    "isSubscribed": false
                },
                "children": []
            }
        ]
    }
}
```

=> Запрос вложенных комментариев

```json
{
    "id": 1,
    "method": "getComments",
    "jsonrpc": "2.0",
    "params": {
        "communityId": "WWAPEPA",
        "userId": "tst1zfzkzodb",
        "permlink": "hestia-fights-with-medea-against-helios-and-common-man-named-mr-august-leffler-iiii-on-yunkai-1570622466236",
        "parentComment": {
            "userId": "tst3xtckjyrn",
            "permlink": "zeus-fights-with-icarus-against-eurynome-and-common-man-named-mr-kaylee-hudsoni-on-pentos-1570622469320"
        }
    }
}
```

<= Ответ

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
        "items": [
            {
                "votes": {
                    "upCount": 0,
                    "downCount": 0,
                    "hasUpVote": false,
                    "hasDownVote": false
                },
                "meta": {
                    "creationTime": "2019-10-09T12:01:12.000Z"
                },
                "childCommentsCount": 1,
                "contentId": {
                    "communityId": "WWAPEPA",
                    "userId": "tst4zkborxrl",
                    "permlink": "zeus-fights-with-hercules-against-perses-and-common-man-named-mrs-chong-reicherti-on-qarth-1570622469887"
                },
                "parents": {
                    "post": {
                        "communityId": "WWAPEPA",
                        "userId": "tst1zfzkzodb",
                        "permlink": "hestia-fights-with-medea-against-helios-and-common-man-named-mr-august-leffler-iiii-on-yunkai-1570622466236"
                    },
                    "comment": {
                        "communityId": "WWAPEPA",
                        "userId": "tst3xtckjyrn",
                        "permlink": "zeus-fights-with-icarus-against-eurynome-and-common-man-named-mr-kaylee-hudsoni-on-pentos-1570622469320"
                    }
                },
                "content": {
                    "body": {
                        "attributes": {
                            "type": "comment",
                            "version": "1.0",
                            "title": "Zeus fights with Hercules against Perses and common man named Mrs.Chong ReichertI on Qarth"
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
                                        "content": "Quantum cryptography does not work on Chuck Norris. When something is being observed by Chuck it stays in the same state until he's finished.\n at the moment he lives at Apt. 337 00918 Mann Path, Lake Grover, KS 09747     \n\n and YODA said: Adventure. Excitement. A Jedi craves not these things. \n\n witcher quote: I'll stick me boot so far up yer arse your tongue'll taste like wench twat \n\n Rick and Morty quote: Keep Summer safe. \n\n SuperHero Goblin Queen has power to Symbiote Costume and Melting \n\n Harry Potter quote: I solemnly swear that I am up to no good. \n\n and some Lorem to finish text: Architecto neque ab nesciunt quod ea qui eaque vitae voluptatem quasi ex expedita rerum hic qui et numquam ipsam illum non sint possimus et ipsum reiciendis sed enim laudantium beatae qui aut doloribus atque non earum cumque at aperiam recusandae dignissimos facilis dolorem dolores pariatur non deleniti est accusamus adipisci laboriosam fugit ullam porro nobis assumenda deserunt aperiam quo libero eligendi nam molestiae est repudiandae nulla unde delectus vel consequatur impedit blanditiis est quia ut officia dolorem consequatur laudantium in et fugit qui autem quia repudiandae cum repudiandae dolor vel labore sunt minus qui quibusdam eligendi rerum qui tempora explicabo consequuntur sed est quam dolor quo non dolores dolores inventore sapiente praesentium ullam molestias adipisci doloremque in vitae sit aperiam facere natus corporis amet temporibus doloribus eos et aut fugiat sunt esse illo vero enim sed dignissimos dolorem perspiciatis qui consequuntur sed exercitationem sint esse saepe nobis facilis sint aut libero eum sit eligendi aspernatur."
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
                "author": {
                    "userId": "tst4zkborxrl",
                    "username": "bartoletti-cassi-jr",
                    "avatarUrl": "https://i.pravatar.cc/300?u=e616310912d3222b9f50a2a1a5bbf87e8c07ae76",
                    "isSubscribed": false
                },
                "community": {
                    "communityId": "WWAPEPA",
                    "alias": "id4197175299",
                    "name": "WWAPEPA comunity",
                    "avatarUrl": "https://i.pravatar.cc/300?u=4533b2fcfd06fdf86b990e9e99f3f6bfc67824b0",
                    "isSubscribed": false
                }
            }
        ]
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
