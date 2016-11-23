# Sup - a messaging API

Sup is a simple messaging API.  Users can be fetched, created, and updated.  Messages can be sent between any two users of Sup. All endpoints require authentication via a Basic Authorization Header unless otherwise specified.

## API Documentation

### Users endpoints

#### `/api/v1/users`

Endpoint representing all users of Sup.

```
GET /api/v1/users
```

Get an array of all users of Sup.

*URL parameters*:

None

*Data parameters*:

None

*Query string parameters*:

None

*Returns*:

An array of all users.

*Example*:

```
> GET /api/v1/users

< Status: 200 OK
< [
<     {
<         "_id": "000000000000000000000000",
<         "username": "alice"
<     }
< ]
```

***

```
POST /api/v1/users (no auth required)
```

Add a user to Sup

*URL Parameters*:

None

*Data parameters*:

User object:
- username (String, required, unique)
- password (ObjectID, required)

*Query string parameters*:

None

*Returns*:

An empty object.

*Example*:

```
> POST /api/v1/users
> {
>     "username": "alice"
> }

< Status: 201 Created
< Location: /users/000000000000000000000000
< {
< }
```

#### `/api/v1/users/:username`

Endpoint representing a single user of Sup.

```
GET /api/v1/users/:username
```

Get a single user of Sup.

*URL parameters*:

* `username` - The username of the user.

*Data parameters*:

None

*Query string parameters*:

None

*Returns*:

A JSON object of the user.

*Example*:

```
> GET /api/v1/users/joe

< Status: 200 OK
< {
<     "_id": "000000000000000000000000",
<     "username": "joe"
< }
```

***

```
PUT /api/v1/users/:username
```

Add or edit a Sup user. A user can only edit his own object.

*URL parameters*:

* `username` - The username of the user to add or edit.

*Data parameters*:

* The user to add or edit

*Query string parameters*:

None

*Returns*:

An empty object.

*Example*:

```
> PUT /api/v1/users/alice
> {
>     "_id": "000000000000000000000"
>     "username": "alice"
> }

< Status: 200 OK
< {
< }
```

***

```
DELETE /users/:username
```

Delete a Sup user.

*URL parameters*:

* `username` - The username of the user to delete.

*Data parameters*:

None

*Query string parameters*:

None

*Returns*:

An empty object.

*Example*:

```
> DELETE /users/alice

< Status: 200 OK
< {
< }
```

### Messages endpoints

#### `/api/v1/messages`

Endpoint representing all messages in Sup. Returns only messages where authenticated user is either sender or recipient.

```
GET /api/v1/messages
```

Get an array of messages in Sup.

*URL parameters*:

None

*Data parameters*:

None

*Query string parameters*:

* `to` - Only select messages to the user with the corresponding ObjectId

*Returns*:

An array of messages.

*Example*:

```
> GET /api/v1/messages

< Status: 200 OK
< [
<     {
<         "_id": "000000000000000000000000",
<         "text": "Hi Bob",
<         "from": {
<             "_id": "0000000000000000000000000",
<             "username": "alice"
<         },
<         "to": {
<             "_id": "1111111111111111111111111",
<             "username": "bob"
<         }
<     }
< ]
```

***

```
POST /api/v1/messages
```

Add a message.

*URL Parameters*:

None

*Data parameters*:

Message object, includes:
- text (String, required)
- to (ObjectID, required)

*Query string parameters*:

None

*Returns*:

An empty object.

*Example*:

```
> POST /api/v1/messages
> {
>     "text": "Hi Bob",
>     "to": "1111111111111111111111111"
> }

< Status: 201 Created
< Location: /messages/000000000000000000000000
< {
< }
```

#### `/api/v1/message/:messageId`

Endpoint representing a single message. Only an authenticated sender or recipient can fetch the message.

```
GET /api/v1/messages/:messageId
```

Get a single message.

*URL parameters*:

* `messageId` - The ObjectId of the message.

*Data parameters*:

None

*Query string parameters*:

None

*Returns*:

A JSON object of the message.

*Example*:

```
> GET /api/v1/messages/000000000000000000000000

< Status: 200 OK
< {
<     "_id": "000000000000000000000000",
<     "text": "Hi Bob",
<     "from": {
<         "_id": "0000000000000000000000000",
<         "username": "alice"
<     },
<     "to": {
<         "_id": "1111111111111111111111111",
<         "username": "bob"
<     }
< }
```

### Error objects

If an error occurs then the API will send a JSON error object in the following format, with an appropriate status code:

```js
{
    "message": "A description of the error"
}
```


