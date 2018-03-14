import { EventEmitter } from 'events';

var request = require('request');

module.exports = function(app) {

    //
    // GET /bot
    //
    app.get('/bot', function(request, response) {
        if (request.query['hub.mode'] === 'subscribe' && 
            request.query['hub.verify_token'] === process.env.BOT_VERIFY_TOKEN) {            
            console.log("Validating webhook");
            response.status(200).send(request.query['hub.challenge']);
        } else {
            console.error("Failed validation. Make sure the validation tokens match.");
            response.sendStatus(403);          
        }  
    });

    //
    // POST /bot
    //
    app.post('/bot', function(request, response) {
       var data = request.body;
       console.log('received bot webhook');
       console.log(JSON.stringify(data))
        // Make sure this is a page subscription
        if (data.object === 'page') {
            // Iterate over each entry - there may be multiple if batched
            data.entry.forEach(function(entry) {
               var pageID = entry.id;
               var timeOfEvent = entry.time;
                // Iterate over each messaging event
                if(entry.messaging)
                {
                    entry.messaging.forEach(function(event) {
                        sendMessageBackWithButton(event);
                    });
                }
                else if(entry.changes) {
                    entry.changes.forEach(function(event) {
                        if (event.field === 'messages') {
                            receivedMessage(event);
                        } else if (event.field === 'messaging_game_plays') {
                            receivedGameplay(event);
                        } else {
                            console.log("Webhook received unknown event: ", event.field);
                        }
                    });
                }
            });
        }
        response.sendStatus(200);
    });

    //
    // Handle messages sent by player directly to the game bot here
    //
    function receivedMessage(event) {
      console.log("Correctly received Message");
      console.log(JSON.stringify(event));
    }

    //
    // Handle game_play (when player closes game) events here. 
    //
    function receivedGameplay(event) {
        console.log("Correctly received Gameplay Event");
        console.log(JSON.stringify(event));
        // Page-scoped ID of the bot user
        // var senderId = event.sender.id; 

        // // FBInstant player ID
        // var playerId = event.game_play.player_id; 

        // // FBInstant context ID 
        // var contextId = event.game_play.context_id;

        // // Check for payload
        // if (event.game_play.payload) {
        //     //
        //     // The variable payload here contains data set by
        //     // FBInstant.setSessionData()
        //     //
        //     var payload = JSON.parse(event.game_play.payload);

        //     // In this example, the bot is just "echoing" the message received
        //     // immediately. In your game, you'll want to delay the bot messages
        //     // to remind the user to play 1, 3, 7 days after game play, for example.
        //     sendMessage(senderId, null, "Want to play again?", "Play now!", payload);
        // }
    }

    function sendMessageBackWithButton(event) {
        var button = {
            type: "game_play",
            title: cta
        };

        button.payload = JSON.stringify(event.message);
        var messageData = {
            recipient: {
                id: event.sender
            },
            message: {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "generic",
                            elements: [
                            {
                                title: "We received your text \"" + event.message.text,
                                buttons: [button]
                            }
                        ]
                    }
                }
            }
        };

        callSendAPI(messageData);
    }

    //
    // Send bot message
    //
    // player (string) : Page-scoped ID of the message recipient
    // context (string): FBInstant context ID. Opens the bot message in a specific context
    // message (string): Message text
    // cta (string): Button text
    // payload (object): Custom data that will be sent to game session
    // 
    function sendMessage(player, context, message, cta, payload) {
        var button = {
            type: "game_play",
            title: cta
        };

        if (context) {
            button.context = context;
        }
        if (payload) {
            button.payload = JSON.stringify(payload)
        }
        var messageData = {
            recipient: {
                id: player
            },
            message: {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "generic",
                        elements: [
                            {
                                title: message,
                                buttons: [button]
                            }
                        ]
                    }
                }
            }
        };

        callSendAPI(messageData);

    }

    function callSendAPI(messageData) {
        var graphApiUrl = 'https://graph.facebook.com/me/messages?access_token='+process.env.PAGE_ACCESS_TOKEN
        request({
            url: graphApiUrl,
            method: "POST",
            json: true,  
            body: messageData
        }, function (error, response, body){
            console.error('send api returned', 'error', error, 'status code', response.statusCode, 'body', body);
        });
    }

}