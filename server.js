var express = require('express');
var emailjs = require('emailjs');

var app = express();

app.post('/sendEmail', function(req, res) {
    console.log('SendEmail Request Received!');
    
    res.send(200, 'Send Email Reached Successfully');
});

app.post('/saveRecord', function(req, res) {
    console.log('Save Record Request Received!');
    
    res.send(200, 'Save Record Reached Successfully');    
});

var server = app.listen(3000, function() {
        console.log('Listening on port %d', server.address().port);
});
