var express = require('express');
var mysql = require('mysql');
var database = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  database: 'thyroidApp'
});
database.connect();

var app = express();
app.use(express.bodyParser());

app.post('/syncRecords', function(request, response) {
  console.log('Save Record Request Received!');

  if (!request.body.email || !request.body.password) {
    return response.send(400, 'Missing log in information.');
  }

  var query = database.query('SELECT email FROM user WHERE email=? AND password=PASSWORD(?)', [request.body.email,
    request.body.password
  ], function(err, result) {
    if (err) {
      return response.send(400, 'Error logging user in.');
    }
    if (!result) {
      return response.send(400, 'Invalid user credentials.');
    }
    var recordsQuery = database.query('SELECT records.date, records.tsh, records.tg, records.synthroidDose '
      + ' FROM records, user '
      + 'WHERE records.user=user.email AND user.email=?'
      + ' ORDER BY records.date DESC', [request.body.email], function(err, records) {
        var recordsToSave = [];
        if (records) {
          newRecords = request.body.newRecords;
          for (var i = 0; i < records.length; i++) {
            recordsToSave[i] = [request.body.email, records[i].date, records[i].tsh, records[i].tg, records[i].synthroidDose];
            for (var j = 0; j < newRecords.length; j++) {
              if (recordsToSave[i][1].now == new Date(newRecords[j].date).now) {
                recordsToSave[i][2] = newRecords[j].tsh;
                recordsToSave[i][3] = newRecords[j].tg;
                recordsToSave[i][4] = newRecords[j].synthroidDose;
              }
            }
          }
        }
        var deleteQuery = database.query('DELETE FROM records WHERE user=?', [request.body.email], function(err, result) {
          if(err) {
            return response.send(400, 'Error occurred syncing records');
          }
          var insertQuery = database.query('INSERT INTO records (user, date, tsh, tg, synthroidDose) VALUES ?', [recordsToSave], function(err, result) {
            console.log(insertQuery.sql);
            if(err) {
              return response.send(400, 'Error occurred syncing records');
            }
            return response.send(200, 'Records synced.');
          });
        })
    });
  });
});

app.post('/getRecords', function(request, response) {
  console.log('Sending records');

  if (!request.body.email || !request.body.password) {
    return response.send(400, 'Missing log in information.');
  }

  var query = database.query('SELECT records.date, records.tsh, records.tg, records.synthroidDose ' + ' FROM records, user ' + 'WHERE records.user=user.email' + ' AND user.email=? AND user.password=PASSWORD(?)' + ' ORDER BY records.date DESC', [request.body.email,
    request.body.password
  ], function(err, result) {
    console.log(result);
    console.log(query.sql);
    return response.send(200, result);
  });

});

app.post('/saveNewUser', function(request, response) {
  console.log('New user being created.');
  var user = request.body.newUser;
  var query = database.query('INSERT INTO user VALUES (?, PASSWORD(?), ?, ?, ?, ?, ?, ?, ?)', [user.email,
    user.password,
    user.firstName,
    user.lastName,
    user.healthCardNumber,
    user.dateOfBirth,
    user.cancerType,
    user.cancerStage,
    user.tshRange
  ], function(err, result) {
    if (err) {
      return response.send(400, 'An error occurred creating this user.');
    }
    return response.json(200, 'User created successfully!');
  });
});

process.on('SIGTERM', function() {
  console.log("Shutting server down.");
  database.end();
  app.close();
});

var server = app.listen(3000, function() {
  console.log('Listening on port %d', server.address().port);
});