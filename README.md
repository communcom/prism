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
          new                      // Лента актуальных постов
        | community                // Лента сообщества
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

#### getPosts (new)

=> Запрос

```json
{
    "id": 1,
    "method": "getPosts",
    "jsonrpc": "2.0",
    "params": {
        "type": "new"
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
                "type": "basic",
                "content": {
                    "attributes": {
                        "type": "basic",
                        "version": "1.0",
                        "title": "Athena fights with Arachne against Themis and common man named Mr.Pamula JaskolskiJr. on Gulltown"

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
                    "creationTime": "2019-10-09T11:53:30.000Z"
                },
                "contentId": {
                    "communityId": "WWAPUPO",
                    "userId": "tst3xtckjyrn",
                    "permlink": "athena-fights-with-arachne-against-themis-and-common-man-named-mr-pamula-jaskolskijr-on-gulltown-1570622007983"
                },
                "author": {
                    "userId": "tst3xtckjyrn",
                    "username": "von-chi-iv",
                    "avatarUrl": "https://i.pravatar.cc/300?u=fa98c7309783247e76d30664dbb5441dddc7b006",
                    "isSubscribed": false
                },
                "community": {
                    "communityId": "WWAPUPO",
                    "alias": "id1377443613",
                    "name": "WWAPUPO comunity",
                    "avatarUrl": "https://i.pravatar.cc/300?u=7a180c543a5ce7adb504de330105542daece71f",
                    "isSubscribed": false
                },
                "type": "basic"
            },
            {
                "type": "comment",
                "content": {
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
                    "creationTime": "2019-10-09T11:55:27.000Z"
                },
                "contentId": {
                    "communityId": "WWAPEPA",
                    "userId": "tst2cudezfyq",
                    "permlink": "apollo-fights-with-jocasta-against-iapetus-and-common-man-named-misscarolynn-jastdvm-on-old-ghis-1570622123554"
                },
                "author": {
                    "userId": "tst2cudezfyq",
                    "username": "hoeger-kourtney-ii",
                    "avatarUrl": "https://i.pravatar.cc/300?u=dea93e06305e88bcabc226d60ad6e88a730a86aa",
                    "isSubscribed": false
                },
                "community": {
                    "communityId": "WWAPEPA",
                    "alias": "id4197175299",
                    "name": "WWAPEPA comunity",
                    "avatarUrl": "https://i.pravatar.cc/300?u=4533b2fcfd06fdf86b990e9e99f3f6bfc67824b0",
                    "isSubscribed": false
                },
                "type": "basic"
            },
            {
                "content": {
                    "type": "basic",
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
                },
                "votes": {
                    "upCount": 0,
                    "downCount": 0,
                    "hasUpVote": false,
                    "hasDownVote": false
                },
                "stats": {
                    "commentsCount": 2
                },
                "meta": {
                    "creationTime": "2019-10-09T11:59:12.000Z"
                },
                "contentId": {
                    "communityId": "WWALUPA",
                    "userId": "tst1lbffvlts",
                    "permlink": "artemis-fights-with-perseus-against-eos-and-common-man-named-dr-mozella-pfannerstilljr-on-bhorash-1570622347691"
                },
                "author": {
                    "userId": "tst1lbffvlts",
                    "username": "bradtke-beata-iii",
                    "avatarUrl": "https://i.pravatar.cc/300?u=2215f41531bb7da7ba3ed02a8328954efebb40bd",
                    "isSubscribed": false
                },
                "community": {
                    "communityId": "WWALUPA",
                    "alias": "id3191997411",
                    "name": "WWALUPA comunity",
                    "avatarUrl": "https://i.pravatar.cc/300?u=316016bea60ab2c9638a94b60d0a80bfc5964840",
                    "isSubscribed": false
                },
                "type": "basic"
            },
            {
                "content": {
                    "attributes": {
                        "type": "basic",
                        "version": "1.0",
                        "title": "Poseidon fights with Theseus against Themis and common man named MissPorter LittelDDS on King's Landing"
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
                                    "content": "Chuck Norris never gets a syntax error. Instead, the language gets a DoesNotConformToChuck error.\n at the moment he lives at Suite 770 25655 Louann Grove, Boscoport, AR 92322-6577     \n\n and YODA said: Younglings, younglings gather ’round. \n\n witcher quote: Damn, Eskel... you got an hourglass figure \n\n Rick and Morty quote: Hello Jerry, come to rub my face in urine again? \n\n SuperHero Dark Hybrid has power to Biokinesis and Thirstokinesis \n\n Harry Potter quote: It is the unknown we fear when we look upon death and darkness, nothing more. \n\n and some Lorem to finish text: Exercitationem similique voluptatem consequuntur dolore quia voluptatem sunt autem hic ut rerum voluptas autem nam animi est nobis qui ratione dolor et aliquam id similique culpa assumenda sed et natus quisquam perspiciatis veritatis cupiditate excepturi minima ad et eos veritatis facilis nulla omnis quia quaerat molestias hic autem et eos officia omnis aut et odit eum iure molestiae qui aut blanditiis eveniet placeat aut nisi incidunt necessitatibus voluptatem sed numquam dolore rem et ullam dolorem quis qui provident error sequi et deserunt voluptatem autem labore quas omnis aliquid et at quis temporibus odio qui natus nihil sint architecto est quia et eaque et rerum voluptatum nemo quam beatae eum non aliquid natus et adipisci iure eos suscipit sit aut voluptatum eveniet iure nihil ipsa reiciendis facilis distinctio qui adipisci qui est aut repellat et commodi cum libero in adipisci aliquid nihil deserunt ducimus molestiae debitis eligendi sunt occaecati nulla quasi impedit maxime deserunt reprehenderit."
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
                },
                "votes": {
                    "upCount": 0,
                    "downCount": 0,
                    "hasUpVote": false,
                    "hasDownVote": false
                },
                "stats": {
                    "commentsCount": 6
                },
                "meta": {
                    "creationTime": "2019-10-09T12:20:21.000Z"
                },
                "contentId": {
                    "communityId": "WWALUPA",
                    "userId": "tst1xztkgyhq",
                    "permlink": "poseidon-fights-with-theseus-against-themis-and-common-man-named-missporter-litteldds-on-king-s-landing-1570623619446"
                },
                "author": {
                    "userId": "tst1xztkgyhq",
                    "username": "kuphal-aldo-ii",
                    "avatarUrl": "https://i.pravatar.cc/300?u=9f585464764e344c1dc6e87dbd5ff44cff8fda53",
                    "isSubscribed": false
                },
                "community": {
                    "communityId": "WWALUPA",
                    "alias": "id3191997411",
                    "name": "WWALUPA comunity",
                    "avatarUrl": "https://i.pravatar.cc/300?u=316016bea60ab2c9638a94b60d0a80bfc5964840",
                    "isSubscribed": false
                },
                "type": "basic"
            },
            {
                "content": {
                    "attributes": {
                        "type": "basic",
                        "version": "1.0",
                        "title": "Dionysus fights with Bellerophon against Epimetheus and common man named Ms.Conchita Leuschke VIV on Lys"
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
                                    "content": "Chuck Norris hosting is 101% uptime guaranteed.\n at the moment he lives at 232 Breitenberg Fields, Lake Woodrowside, NE 13632-2272     \n\n and YODA said: Already know you that which you need. \n\n witcher quote: Mistakes,’ he said with effort, ‘are also important to me. I don’t cross them out of my life, or memory. And I never blame others for them. \n\n Rick and Morty quote: It's fine, everything is fine. Theres an infinite number of realities Morty and in a few dozen of those I got lucky and turned everything back to normal. \n\n SuperHero Green Deadshot Claw has power to Invulnerability and Natural Weapons \n\n Harry Potter quote: There are some things you can't share without ending up liking each other, and knocking out a twelve-foot mountain troll is one of them. \n\n and some Lorem to finish text: Dolor et laborum nesciunt aspernatur ipsa vitae culpa iste quibusdam voluptatum ratione aspernatur voluptatem nam cum quis sed sunt beatae pariatur provident eaque error temporibus veritatis laudantium hic rerum qui aut magni vitae consectetur molestias perspiciatis cumque consequatur necessitatibus molestias tempora et aut id expedita quia dolor dolorem ipsam et eos velit a aperiam et et omnis non neque modi ut enim et dolores reprehenderit id sed consequuntur sit sed eos ut adipisci libero quisquam nemo quia deleniti et explicabo quibusdam est nesciunt ullam occaecati in quisquam soluta tenetur impedit libero corporis deserunt ut rerum nostrum magnam provident nisi nostrum nobis repellat rerum maiores pariatur explicabo ea et qui et minima aut officia vel eligendi minima in omnis et eum praesentium laborum dignissimos voluptate voluptas facere consequatur facere fuga eum delectus placeat magni est sequi quis aspernatur suscipit est quis et voluptatem porro ea veniam culpa earum non accusantium quasi."
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
                },
                "votes": {
                    "upCount": 0,
                    "downCount": 0,
                    "hasUpVote": false,
                    "hasDownVote": false
                },
                "stats": {
                    "commentsCount": 4
                },
                "meta": {
                    "creationTime": "2019-10-09T12:21:03.000Z"
                },
                "contentId": {
                    "communityId": "WREK",
                    "userId": "tst1lbffvlts",
                    "permlink": "dionysus-fights-with-bellerophon-against-epimetheus-and-common-man-named-ms-conchita-leuschke-viv-on-lys-1570623660357"
                },
                "author": {
                    "userId": "tst1lbffvlts",
                    "username": "bradtke-beata-iii",
                    "avatarUrl": "https://i.pravatar.cc/300?u=2215f41531bb7da7ba3ed02a8328954efebb40bd",
                    "isSubscribed": false
                },
                "community": {
                    "communityId": "WREK",
                    "alias": "id2599799600",
                    "name": "WREK comunity",
                    "avatarUrl": "https://i.pravatar.cc/300?u=20528f91b85f0d42ca3c95019bcb2f70b0071c8a",
                    "isSubscribed": false
                },
                "type": "basic"
            },
            {
                "content": {
                    "id": 1,
                    "type": "post",
                    "attributes": {
                        "version": "1.0",
                        "type": "basic"
                    },
                    "content": [
                        {
                            "id": 2,
                            "type": "paragraph",
                            "content": [
                                {
                                    "id": 3,
                                    "type": "text",
                                    "content": "Hello world"
                                }
                            ]
                        }
                    ]
                },
                "votes": {
                    "upCount": 1,
                    "downCount": 0,
                    "hasUpVote": false,
                    "hasDownVote": false
                },
                "stats": {
                    "commentsCount": 0
                },
                "meta": {
                    "creationTime": "2019-10-09T15:17:24.000Z"
                },
                "contentId": {
                    "communityId": "CATS",
                    "userId": "tst3evxcjgjn",
                    "permlink": "1570634237"
                },
                "author": {
                    "userId": "tst3evxcjgjn",
                    "username": "bayer-van-dds",
                    "avatarUrl": "https://img.golos.io/images/12DcKUF5SFgXyt9dazqn7ibu5Pn.jpg",
                    "isSubscribed": false
                },
                "community": {
                    "communityId": "CATS",
                    "alias": "id2507527990",
                    "name": "cats",
                    "isSubscribed": false
                },
                "type": "basic"
            },
            {
                "content": {
                    "attributes": {
                        "type": "basic",
                        "version": "1.0",
                        "title": "Hera fights with Orpheus against Epimetheus and common man named Dr.Tran SchowalterIV on Tolos"
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
                                    "content": "All arrays Chuck Norris declares are of infinite size, because Chuck Norris knows no bounds.\n at the moment he lives at 2052 Kshlerin Spur, Lake Avery, MO 13006     \n\n and YODA said: Difficult to see. Always in motion is the future... \n\n witcher quote: Just five more minutes… Is it 1358 yet? No? Then fuck off! \n\n Rick and Morty quote: Great, now I have to take over an entire planet because of your stupid boobs. \n\n SuperHero Violator Ivy has power to Animation and Telekinesis \n\n Harry Potter quote: After all this time? Always. \n\n and some Lorem to finish text: Voluptatem consequatur libero voluptatibus tempora eligendi similique facilis voluptates dolore repellat et quia dolorem voluptas nam alias repellendus mollitia soluta cum officiis molestiae illum aut veritatis dolores voluptas quia accusamus nostrum doloremque sed et ut ullam fuga culpa incidunt magni ducimus perferendis dolores repudiandae vel esse mollitia molestiae et optio maxime qui tempora distinctio cumque quibusdam impedit autem perspiciatis commodi sunt quisquam quod non quis aut et eos qui non dolorum alias placeat debitis rerum et exercitationem aliquam autem dolorum ea animi quia sed et repellat deserunt quos architecto sit et quo aut blanditiis ea est velit aliquid in accusamus delectus numquam dolor sed ut praesentium molestias nihil consequatur incidunt ea incidunt debitis ipsum pariatur doloribus iusto sint inventore temporibus minus qui est quisquam et dolores laudantium omnis aut dolores nulla quam corporis rerum blanditiis dolores doloribus eum voluptas corporis officiis itaque reiciendis minus eum qui voluptate quia autem explicabo voluptatem vel."
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
                },
                "votes": {
                    "upCount": 0,
                    "downCount": 0,
                    "hasUpVote": false,
                    "hasDownVote": false
                },
                "stats": {
                    "commentsCount": 4
                },
                "meta": {
                    "creationTime": "2019-10-11T14:04:09.000Z"
                },
                "contentId": {
                    "communityId": "KADJ",
                    "userId": "tst2ktdcwamk",
                    "permlink": "hera-fights-with-orpheus-against-epimetheus-and-common-man-named-dr-tran-schowalteriv-on-tolos-1570802646241"
                },
                "author": {
                    "userId": "tst2ktdcwamk",
                    "username": "littel-luna-dds",
                    "avatarUrl": "https://i.pravatar.cc/300?u=5cbd65b420529cab5b92fe08e71edf839b0454a9",
                    "isSubscribed": false
                },
                "community": {
                    "communityId": "KADJ",
                    "alias": "id1497768118",
                    "name": "KADJ comunity",
                    "avatarUrl": "https://i.pravatar.cc/300?u=a610fb8076404306b32efd006bd0760c905a4e7c",
                    "isSubscribed": false
                },
                "type": "basic"
            },
            {
                "content": {
                    "id": 1,
                    "type": "post",
                    "attributes": {
                        "version": "1.0",
                        "type": "basic"
                    },
                    "content": [
                        {
                            "id": 2,
                            "type": "paragraph",
                            "content": [
                                {
                                    "id": 3,
                                    "type": "text",
                                    "content": "Hello World"
                                }
                            ]
                        }
                    ]
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
                    "creationTime": "2019-10-11T17:41:33.000Z"
                },
                "contentId": {
                    "communityId": "CATS",
                    "userId": "tst3evxcjgjn",
                    "permlink": "1570815690"
                },
                "author": {
                    "userId": "tst3evxcjgjn",
                    "username": "bayer-van-dds",
                    "avatarUrl": "https://img.golos.io/images/12DcKUF5SFgXyt9dazqn7ibu5Pn.jpg",
                    "isSubscribed": false
                },
                "community": {
                    "communityId": "CATS",
                    "alias": "id2507527990",
                    "name": "cats",
                    "isSubscribed": false
                },
                "type": "basic"
            },
            {
                "content": {
                    "id": 1,
                    "type": "post",
                    "attributes": {
                        "version": "1.0",
                        "type": "basic"
                    },
                    "content": [
                        {
                            "id": 2,
                            "type": "paragraph",
                            "content": [
                                {
                                    "id": 3,
                                    "type": "text",
                                    "content": "Hi Hello There!"
                                }
                            ]
                        }
                    ]
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
                    "creationTime": "2019-10-11T17:45:45.000Z"
                },
                "contentId": {
                    "communityId": "CATS",
                    "userId": "tst3evxcjgjn",
                    "permlink": "1570815940"
                },
                "author": {
                    "userId": "tst3evxcjgjn",
                    "username": "bayer-van-dds",
                    "avatarUrl": "https://img.golos.io/images/12DcKUF5SFgXyt9dazqn7ibu5Pn.jpg",
                    "isSubscribed": false
                },
                "community": {
                    "communityId": "CATS",
                    "alias": "id2507527990",
                    "name": "cats",
                    "isSubscribed": false
                },
                "type": "basic"
            },
            {
                "content": {
                    "id": 1,
                    "type": "post",
                    "attributes": {
                        "version": "1.0",
                        "type": "basic"
                    },
                    "content": [
                        {
                            "id": 2,
                            "type": "paragraph",
                            "content": [
                                {
                                    "id": 3,
                                    "type": "text",
                                    "content": "Where is my pony?"
                                }
                            ]
                        }
                    ]
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
                    "creationTime": "2019-10-11T17:48:54.000Z"
                },
                "contentId": {
                    "communityId": "CATS",
                    "userId": "tst3evxcjgjn",
                    "permlink": "1570816130"
                },
                "author": {
                    "userId": "tst3evxcjgjn",
                    "username": "bayer-van-dds",
                    "avatarUrl": "https://img.golos.io/images/12DcKUF5SFgXyt9dazqn7ibu5Pn.jpg",
                    "isSubscribed": false
                },
                "community": {
                    "communityId": "CATS",
                    "alias": "id2507527990",
                    "name": "cats",
                    "isSubscribed": false
                },
                "type": "basic"
            }
        ]
    }
}
```

#### getPosts (community new)

=> Запрос

```json
{
    "id": 1,
    "method": "getPosts",
    "jsonrpc": "2.0",
    "params": {
        "type": "community",
    	"communityId": "WWAPEPA"
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
                    "attributes": {
                        "type": "basic",
                        "version": "1.0",
                        "title": "Apollo fights with Jocasta against Iapetus and common man named MissCarolynn JastDVM on Old Ghis"
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
                                    "content": "Chuck Norris's keyboard doesn't have a Ctrl key because nothing controls Chuck Norris.\n at the moment he lives at Suite 041 9434 Feest Walks, Wiltonport, ID 24538-0826     \n\n and YODA said: At an end your rule is, and not short enough it was! \n\n witcher quote: Only death can finish the fight, everything else only interrupts the fighting. \n\n Rick and Morty quote: Let me out, what you see is not the same person as me. My life's a lie. I'm not who you're looking. Let me out. Set me free. I'm really old. This isn't me. My real body is slowly dieing in a vat. Is anybody listening? Can anyone understand? Stop looking at me like that and actually help me. Help me. Help me I'm gunna die. \n\n SuperHero Shatterstar Wolf has power to Sub-Mariner and Elasticity \n\n Harry Potter quote: To the well-organized mind, death is but the next great adventure. \n\n and some Lorem to finish text: Eaque doloribus eos nam error et saepe consectetur error laudantium occaecati accusantium earum maiores blanditiis et soluta at qui quia voluptate est ut qui sint similique illo modi repudiandae dolores cumque earum voluptatem inventore amet velit quas enim esse reiciendis omnis temporibus quod ipsum temporibus et aut neque et dolor dicta corporis illo alias odio cupiditate necessitatibus architecto amet quo omnis necessitatibus quo natus eos cumque in voluptates magnam maxime ad est architecto iure et quisquam sint et rem atque sapiente eum sit ipsam neque amet eaque suscipit nesciunt odio dolorem odio illum officia temporibus est consequatur eaque et amet est animi facilis occaecati veniam eius vel assumenda rerum expedita quia omnis at repellendus et non ea aut nihil cum officiis quibusdam doloremque nostrum rerum est quis aut veritatis quod totam et officia perferendis fugiat voluptates incidunt aliquid beatae eligendi at labore quidem sunt distinctio iusto quos itaque fugit voluptatem et."
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
                },
                "votes": {
                    "upCount": 0,
                    "downCount": 0
                },
                "stats": {
                    "commentsCount": 0
                },
                "meta": {
                    "creationTime": "2019-10-09T11:55:27.000Z"
                },
                "contentId": {
                    "communityId": "WWAPEPA",
                    "userId": "tst2cudezfyq",
                    "permlink": "apollo-fights-with-jocasta-against-iapetus-and-common-man-named-misscarolynn-jastdvm-on-old-ghis-1570622123554"
                },
                "author": {
                    "userId": "tst2cudezfyq",
                    "username": "hoeger-kourtney-ii",
                    "avatarUrl": "https://i.pravatar.cc/300?u=dea93e06305e88bcabc226d60ad6e88a730a86aa"
                },
                "community": {
                    "communityId": "WWAPEPA",
                    "alias": "id4197175299",
                    "name": "WWAPEPA comunity",
                    "avatarUrl": "https://i.pravatar.cc/300?u=4533b2fcfd06fdf86b990e9e99f3f6bfc67824b0"
                },
                "type": "basic"
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

=> Запрос комментариев пользователя

```json
{
    "id": 1,
    "method": "getComments",
    "jsonrpc": "2.0",
    "params": {
    	"type": "user",
        "userId": "tst4zphxiuon",
        "sortBy": "timeDesc"
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
                    "downCount": 0
                },
                "meta": {
                    "creationTime": "2019-10-09T12:06:09.000Z"
                },
                "childCommentsCount": 1,
                "contentId": {
                    "communityId": "WWAPUPO",
                    "userId": "tst4zphxiuon",
                    "permlink": "apollo-fights-with-chrysippus-against-eurynome-and-common-man-named-mr-albertha-shieldssr-on-volantis-1570622768771"
                },
                "parents": {
                    "post": {
                        "communityId": "WWAPUPO",
                        "userId": "tst3ydywtehj",
                        "permlink": "apollo-fights-with-ajax-against-phoebe-and-common-man-named-dr-nicky-carrolldds-on-sar-meel-1570622762914"
                    },
                    "comment": null
                },
                "content": {
                    "attributes": {
                        "type": "comment",
                        "version": "1.0",
                        "title": "Apollo fights with Chrysippus against Eurynome and common man named Mr.Albertha ShieldsSr. on Volantis"
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
                                    "content": "The class object inherits from Chuck Norris.\n at the moment he lives at Apt. 358 8882 Oswaldo Crossing, Collierton, ID 02087-9324     \n\n and YODA said: Luminous beings are we - not this crude matter. \n\n witcher quote: You’ve mistaken the stars reflected on the surface of the lake at night for the heavens. \n\n Rick and Morty quote: You're like Hitler, except...Hitler cared about Germany, or something. \n\n SuperHero Doctor Longshot Brain has power to Toxikinesis and Astral Projection \n\n Harry Potter quote: We could all have been killed - or worse, expelled. \n\n and some Lorem to finish text: Consequatur explicabo quas beatae et labore facere ea debitis unde consequatur qui voluptas consectetur rerum facere non et porro pariatur doloremque est ullam exercitationem eligendi eius dolor quas inventore quo soluta adipisci aut quae molestias aspernatur et ad aut unde voluptates nostrum qui voluptatem vitae itaque sapiente maiores rerum beatae nobis tempora quae omnis occaecati quia tenetur molestiae commodi nam magnam quia dignissimos rerum exercitationem nobis saepe et deleniti iure sint rerum qui nihil corrupti et ea et numquam id accusamus enim eos repellat dignissimos omnis omnis distinctio nisi esse iure iusto exercitationem dolorem dolores illum dolores aperiam dolor est consequatur repudiandae corporis et placeat nostrum harum quaerat ut rem minima quae et deleniti iusto voluptatem et corrupti sed quo error laboriosam est ea ratione quo et voluptas tenetur quidem sint laboriosam odit eum dolorem adipisci consequatur officiis pariatur magnam facere eos minus voluptates incidunt tenetur hic molestiae qui animi dignissimos dolor natus."
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
                },
                "author": {
                    "userId": "tst4zphxiuon",
                    "username": "bergstrom-donnie-dvm",
                    "avatarUrl": "https://i.pravatar.cc/300?u=8acb26411b5e082e1b6358dd1c3621aed0161cba"
                },
                "community": {
                    "communityId": "WWAPUPO",
                    "alias": "id1377443613",
                    "name": "WWAPUPO comunity",
                    "avatarUrl": "https://i.pravatar.cc/300?u=7a180c543a5ce7adb504de330105542daece71f"
                }
            },
            {
                "votes": {
                    "upCount": 0,
                    "downCount": 0
                },
                "meta": {
                    "creationTime": "2019-10-09T12:06:12.000Z"
                },
                "childCommentsCount": 1,
                "contentId": {
                    "communityId": "WWAPUPO",
                    "userId": "tst4zphxiuon",
                    "permlink": "hera-fights-with-pandion-against-eurybia-and-common-man-named-mrs-gwendolyn-goyettemd-on-king-s-landing-1570622769714"
                },
                "parents": {
                    "post": {
                        "communityId": "WWAPUPO",
                        "userId": "tst4oysprhyz",
                        "permlink": "ares-fights-with-bellerophon-against-cronus-and-common-man-named-ms-miss-sophie-mrazii-on-lannisport-1570622762365"
                    },
                    "comment": {
                        "communityId": "WWAPUPO",
                        "userId": "tst2gdfxuyvm",
                        "permlink": "apollo-fights-with-abderus-against-tethys-and-common-man-named-missemery-considinedds-on-new-ghis-1570622768902"
                    }
                },
                "content": {
                    "attributes": {
                        "type": "comment",
                        "version": "1.0",
                        "title": "Hera fights with Pandion against Eurybia and common man named Mrs.Gwendolyn GoyetteMD on King's Landing"
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
                                    "content": "Chuck Norris went out of an infinite loop.\n at the moment he lives at Apt. 074 5408 Jenna Oval, North Lyleburgh, TN 22898     \n\n and YODA said: Good relations with the Wookiees, I have. \n\n witcher quote: There's a grain of truth in every fairy tale. \n\n Rick and Morty quote: Aww, gee, you got me there Rick. \n\n SuperHero General Toxin has power to Radiation Control and Elasticity \n\n Harry Potter quote: Dark and difficult times lie ahead. Soon we must all face the choice between what is right and what is easy. \n\n and some Lorem to finish text: Et nihil ullam necessitatibus quidem nihil ab delectus odit quisquam assumenda facilis quos eos fugiat animi sint rem eum est qui minus est quia in voluptatem totam nisi iste a ratione quia et et aut blanditiis aut non tenetur laborum quia autem et quo velit quod quia aut et eligendi dolorem voluptatem est reprehenderit eveniet omnis et tenetur facere quas praesentium et expedita sunt vel velit itaque ut qui quo occaecati aut voluptatem voluptas totam soluta sed ea voluptatum ex aut quia consequatur autem aut laudantium natus sequi optio voluptates voluptas saepe dolor eum quis enim repudiandae voluptatibus repellendus maxime quasi consequuntur sed eius unde qui iusto a numquam quo architecto quaerat non optio debitis minus veniam nisi quo dolor sed rem nobis quidem corporis vel ut voluptatem ipsam aut dolor atque cumque eos quos voluptatem ab officiis dolores aut et nobis fugiat eius labore cumque ea quisquam eveniet dolorem fugiat."
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
                },
                "author": {
                    "userId": "tst4zphxiuon",
                    "username": "bergstrom-donnie-dvm",
                    "avatarUrl": "https://i.pravatar.cc/300?u=8acb26411b5e082e1b6358dd1c3621aed0161cba"
                },
                "community": {
                    "communityId": "WWAPUPO",
                    "alias": "id1377443613",
                    "name": "WWAPUPO comunity",
                    "avatarUrl": "https://i.pravatar.cc/300?u=7a180c543a5ce7adb504de330105542daece71f"
                }
            }
        ]
    }
}
```

=> Запрос ответов пользователю

```json
{
    "id": 1,
    "method": "getComments",
    "jsonrpc": "2.0",
    "params": {
    	"type": "replies",
        "userId": "tst3ydywtehj",
        "sortBy": "timeDesc"
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
                    "downCount": 0
                },
                "meta": {
                    "creationTime": "2019-10-09T12:06:09.000Z"
                },
                "childCommentsCount": 0,
                "contentId": {
                    "communityId": "WWAPUPO",
                    "userId": "tst4ywpbdkfd",
                    "permlink": "aphrodite-fights-with-orpheus-against-helios-and-common-man-named-misslamont-dicki-phdjr-on-bhorash-1570622767790"
                },
                "parents": {
                    "post": {
                        "communityId": "WWAPUPO",
                        "userId": "tst3ydywtehj",
                        "permlink": "apollo-fights-with-ajax-against-phoebe-and-common-man-named-dr-nicky-carrolldds-on-sar-meel-1570622762914"
                    },
                    "comment": null
                },
                "content": {
                    "attributes": {
                        "type": "comment",
                        "version": "1.0",
                        "title": "Aphrodite fights with Orpheus against Helios and common man named MissLamont Dicki PhDJr. on Bhorash"
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
                                    "content": "Chuck Norris programs do not accept input.\n at the moment he lives at Suite 025 6412 Nikolaus Pike, Runolfsdottirfort, IA 46613-1306     \n\n and YODA said: Younglings, younglings gather ’round. \n\n witcher quote: Finish all your business before you die. Bid loved ones farewell. Write your will. Apologize to those you’ve wronged. Otherwise, you’ll never truly leave this world. \n\n Rick and Morty quote: This isn't Game of Thrones, Morty. \n\n SuperHero General Bolt Woman has power to Empathy and Adaptation \n\n Harry Potter quote: After all this time? Always. \n\n and some Lorem to finish text: Laborum est aut mollitia expedita voluptatibus est quasi nulla et velit et enim et rerum dolores iure vel harum quo modi culpa rerum cum quia et alias quidem quam sunt doloribus omnis omnis illum quo asperiores sint blanditiis facere minima nulla in incidunt quia eius vel maxime totam atque quod velit vero et voluptas beatae vel dolorem qui occaecati repellendus sint voluptatem nostrum nemo expedita ut iure quia quisquam fuga veniam qui et in ut animi libero optio cum ut voluptas quis a enim quia iusto fugiat dignissimos dolores omnis ex officia sint deserunt corrupti qui labore quasi et vel culpa ut unde dolore ut atque fugiat cum soluta quae commodi aspernatur aut vel et est voluptas aut culpa placeat inventore tenetur ullam et voluptas molestias ab id et sit quae maxime reprehenderit quae exercitationem est assumenda perferendis architecto sit laboriosam voluptatem et dignissimos distinctio nam in aut sunt soluta earum minima accusantium quis."
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
                },
                "author": {
                    "userId": "tst4ywpbdkfd",
                    "username": "price-otelia-i",
                    "avatarUrl": "https://i.pravatar.cc/300?u=727bd6acdb84203af624f5f9ab364fa8b9b67a69"
                },
                "community": {
                    "communityId": "WWAPUPO",
                    "alias": "id1377443613",
                    "name": "WWAPUPO comunity",
                    "avatarUrl": "https://i.pravatar.cc/300?u=7a180c543a5ce7adb504de330105542daece71f"
                }
            },
            {
                "votes": {
                    "upCount": 0,
                    "downCount": 0
                },
                "meta": {
                    "creationTime": "2019-10-09T12:06:09.000Z"
                },
                "childCommentsCount": 1,
                "contentId": {
                    "communityId": "WWAPUPO",
                    "userId": "tst4zphxiuon",
                    "permlink": "apollo-fights-with-chrysippus-against-eurynome-and-common-man-named-mr-albertha-shieldssr-on-volantis-1570622768771"
                },
                "parents": {
                    "post": {
                        "communityId": "WWAPUPO",
                        "userId": "tst3ydywtehj",
                        "permlink": "apollo-fights-with-ajax-against-phoebe-and-common-man-named-dr-nicky-carrolldds-on-sar-meel-1570622762914"
                    },
                    "comment": null
                },
                "content": {
                    "attributes": {
                        "type": "comment",
                        "version": "1.0",
                        "title": "Apollo fights with Chrysippus against Eurynome and common man named Mr.Albertha ShieldsSr. on Volantis"
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
                                    "content": "The class object inherits from Chuck Norris.\n at the moment he lives at Apt. 358 8882 Oswaldo Crossing, Collierton, ID 02087-9324     \n\n and YODA said: Luminous beings are we - not this crude matter. \n\n witcher quote: You’ve mistaken the stars reflected on the surface of the lake at night for the heavens. \n\n Rick and Morty quote: You're like Hitler, except...Hitler cared about Germany, or something. \n\n SuperHero Doctor Longshot Brain has power to Toxikinesis and Astral Projection \n\n Harry Potter quote: We could all have been killed - or worse, expelled. \n\n and some Lorem to finish text: Consequatur explicabo quas beatae et labore facere ea debitis unde consequatur qui voluptas consectetur rerum facere non et porro pariatur doloremque est ullam exercitationem eligendi eius dolor quas inventore quo soluta adipisci aut quae molestias aspernatur et ad aut unde voluptates nostrum qui voluptatem vitae itaque sapiente maiores rerum beatae nobis tempora quae omnis occaecati quia tenetur molestiae commodi nam magnam quia dignissimos rerum exercitationem nobis saepe et deleniti iure sint rerum qui nihil corrupti et ea et numquam id accusamus enim eos repellat dignissimos omnis omnis distinctio nisi esse iure iusto exercitationem dolorem dolores illum dolores aperiam dolor est consequatur repudiandae corporis et placeat nostrum harum quaerat ut rem minima quae et deleniti iusto voluptatem et corrupti sed quo error laboriosam est ea ratione quo et voluptas tenetur quidem sint laboriosam odit eum dolorem adipisci consequatur officiis pariatur magnam facere eos minus voluptates incidunt tenetur hic molestiae qui animi dignissimos dolor natus."
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
                },
                "author": {
                    "userId": "tst4zphxiuon",
                    "username": "bergstrom-donnie-dvm",
                    "avatarUrl": "https://i.pravatar.cc/300?u=8acb26411b5e082e1b6358dd1c3621aed0161cba"
                },
                "community": {
                    "communityId": "WWAPUPO",
                    "alias": "id1377443613",
                    "name": "WWAPUPO comunity",
                    "avatarUrl": "https://i.pravatar.cc/300?u=7a180c543a5ce7adb504de330105542daece71f"
                }
            },
            {
                "votes": {
                    "upCount": 0,
                    "downCount": 0
                },
                "meta": {
                    "creationTime": "2019-10-09T12:06:12.000Z"
                },
                "childCommentsCount": 1,
                "contentId": {
                    "communityId": "WWAPUPO",
                    "userId": "tst3xtckjyrn",
                    "permlink": "apollo-fights-with-ariadne-against-helios-and-common-man-named-missdr-misha-priceii-on-norvos-1570622769603"
                },
                "parents": {
                    "post": {
                        "communityId": "WWAPUPO",
                        "userId": "tst3ydywtehj",
                        "permlink": "apollo-fights-with-ajax-against-phoebe-and-common-man-named-dr-nicky-carrolldds-on-sar-meel-1570622762914"
                    },
                    "comment": {
                        "communityId": "WWAPUPO",
                        "userId": "tst4zphxiuon",
                        "permlink": "apollo-fights-with-chrysippus-against-eurynome-and-common-man-named-mr-albertha-shieldssr-on-volantis-1570622768771"
                    }
                },
                "content": {
                    "attributes": {
                        "type": "comment",
                        "version": "1.0",
                        "title": "Apollo fights with Ariadne against Helios and common man named MissDr. Misha PriceII on Norvos"
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
                                    "content": "Chuck Norris doesn't believe in floating point numbers because they can't be typed on his binary keyboard.\n at the moment he lives at 96927 Rogahn Fall, Kulasfurt, NV 32997-9407     \n\n and YODA said: Reckless he is. Matters are worse. \n\n witcher quote: I'll stick me boot so far up yer arse your tongue'll taste like wench twat \n\n Rick and Morty quote: What is my purpose. You pass butter. Oh My God. Yeah, Welcome to the club pal. \n\n SuperHero Thunderbird has power to Natural Weapons and Power Cosmic \n\n Harry Potter quote: It does not do to dwell on dreams and forget to live. \n\n and some Lorem to finish text: Non itaque enim necessitatibus facere quia dolorem delectus optio aspernatur sapiente illum quam a autem et animi dolore quaerat in dolor qui maxime assumenda tenetur qui perferendis qui voluptatem vero tempore saepe ut totam dolore dolores suscipit non dolor excepturi cumque earum saepe qui asperiores veniam porro laborum expedita officiis repellat iure consequatur numquam asperiores omnis aut eveniet facilis inventore facilis porro sequi sunt distinctio odio voluptatibus dicta est nihil et fugiat autem id voluptatem et qui illo iusto possimus enim dicta ducimus eum facere et nihil cum a quia dignissimos nostrum est repudiandae sint rerum repellat necessitatibus amet accusantium eum consectetur eos cum voluptatem qui sunt sed tenetur temporibus non libero reiciendis doloribus natus vero inventore et voluptatem ratione earum qui est animi sapiente ea nihil similique consectetur quasi saepe officia ipsum sit quidem cum aut labore blanditiis voluptatem et officia labore quisquam officiis ea atque ex earum placeat vitae molestiae ipsum."
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
                },
                "author": {
                    "userId": "tst3xtckjyrn",
                    "username": "von-chi-iv",
                    "avatarUrl": "https://i.pravatar.cc/300?u=fa98c7309783247e76d30664dbb5441dddc7b006"
                },
                "community": {
                    "communityId": "WWAPUPO",
                    "alias": "id1377443613",
                    "name": "WWAPUPO comunity",
                    "avatarUrl": "https://i.pravatar.cc/300?u=7a180c543a5ce7adb504de330105542daece71f"
                }
            },
            {
                "votes": {
                    "upCount": 0,
                    "downCount": 0
                },
                "meta": {
                    "creationTime": "2019-10-09T12:06:12.000Z"
                },
                "childCommentsCount": 0,
                "contentId": {
                    "communityId": "WWAPUPO",
                    "userId": "tst1xztkgyhq",
                    "permlink": "demeter-fights-with-cassiopeia-against-lelantos-and-common-man-named-dr-mayme-hills-dvmdvm-on-asshai-1570622770381"
                },
                "parents": {
                    "post": {
                        "communityId": "WWAPUPO",
                        "userId": "tst3ydywtehj",
                        "permlink": "apollo-fights-with-ajax-against-phoebe-and-common-man-named-dr-nicky-carrolldds-on-sar-meel-1570622762914"
                    },
                    "comment": {
                        "communityId": "WWAPUPO",
                        "userId": "tst3xtckjyrn",
                        "permlink": "apollo-fights-with-ariadne-against-helios-and-common-man-named-missdr-misha-priceii-on-norvos-1570622769603"
                    }
                },
                "content": {
                    "attributes": {
                        "type": "comment",
                        "version": "1.0",
                        "title": "Demeter fights with Cassiopeia against Lelantos and common man named Dr.Mayme Hills DVMDVM on Asshai"
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
                                    "content": "Chuck Norris doesn't need a debugger, he just stares down the bug until the code confesses.\n at the moment he lives at Apt. 904 3923 Kuhn Spur, New Scottieside, KS 29157-5233     \n\n and YODA said: Good relations with the Wookiees, I have. \n\n witcher quote: Destiny has many faces. Mine is beautiful on the outside and hideous on the inside. She has stretched her bloody talons toward me— \n\n Rick and Morty quote: What about the reality where Hitler cured cancer, Morty? The answer is: Don't think about it. \n\n SuperHero Supah Bloodaxe has power to Chlorokinesis and Sonic Scream \n\n Harry Potter quote: Never trust anything that can think for itself if you can't see where it keeps its brain. \n\n and some Lorem to finish text: Nulla non omnis rerum facilis architecto corporis ea fugit quisquam maxime quae et blanditiis consectetur at magnam harum quo sunt debitis velit at repudiandae incidunt et rerum veniam est dicta earum repellat totam placeat odio id ea repudiandae ab accusantium pariatur ut vel nemo aut dolores dicta nemo est porro blanditiis recusandae culpa est expedita voluptas voluptas rerum corporis doloremque modi laudantium reiciendis excepturi odit unde eos voluptas et repellendus architecto nemo sit ut aperiam voluptas eum et natus reiciendis vel quaerat quisquam tempore nesciunt corporis est non fugiat impedit et sed non voluptatibus expedita sit ab fuga quasi et ab quis omnis odit dolorum dolorum odit aut molestiae assumenda reiciendis dolore soluta nobis aut tempora quibusdam quos optio hic eius veritatis sit aspernatur nisi consequatur qui perferendis enim aut aliquam delectus quam quia enim aperiam sed nemo quia quis illum quis quas earum ipsum et laboriosam veniam quos molestiae."
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
                },
                "author": {
                    "userId": "tst1xztkgyhq",
                    "username": "kuphal-aldo-ii",
                    "avatarUrl": "https://i.pravatar.cc/300?u=9f585464764e344c1dc6e87dbd5ff44cff8fda53"
                },
                "community": {
                    "communityId": "WWAPUPO",
                    "alias": "id1377443613",
                    "name": "WWAPUPO comunity",
                    "avatarUrl": "https://i.pravatar.cc/300?u=7a180c543a5ce7adb504de330105542daece71f"
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
