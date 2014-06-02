var express = require('express');
var mysql = require('mysql');
var database = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  database: 'thyroidApp'
});
database.connect();

//CORS middleware
var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
}

var app = express();
app.use(express.bodyParser());
app.use(allowCrossDomain);

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
        var newRecords = request.body.newRecords;
        var recordsToSave = [];
        for (var i = 0; i < newRecords.length; i++) {
          var newRecord = [request.body.email, newRecords[i].date, newRecords[i].tsh, newRecords[i].tg, newRecords[i].synthroidDose];
          recordsToSave.push(newRecord);
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

app.post('/login', function(request, response) {
  console.log('Logging user in');
  console.log(request.body);
  if (!request.body.email || !request.body.password) {
    return response.send(400, 'Missing log in information.');
  }

  var query = database.query('SELECT * ' 
    + ' FROM user ' 
    + 'WHERE user.email=? AND user.password=PASSWORD(?)', [request.body.email,
    request.body.password
  ], function(err, result) {
    console.log(result);
    console.log(query.sql);
    if(!result.length) {
      return response.send(400, 'Invalid password and email provided.');
    }
    delete result[0].password;
    return response.send(200, result[0]);
  });

});

app.post('/saveNewUser', function(request, response) {
  console.log('New user being created.');
  var user = request.body.newUser;
  var query = database.query('INSERT INTO user VALUES (?, PASSWORD(?), ?, ?, ?, ?, ?, ?, ?, ?)', [user.Email,
    user.NewPassword,
    user.FirstName,
    user.LastName,
    user.HealthCardNumber,
    user.DOB,
    user.CancerType,
    user.CancerStage,
    user.TshRange,
    false // agreedToLegal
  ], function(err, result) {
    if (err) {
      console.log(err);
      console.log(query.sql);
      return response.send(400, 'An error occurred creating this user.');
    }
    return response.json(200, 'User created successfully!');
  });
});

function formatDateOfBirth(dateString) {
  var date = new Date(dateString);
  var month = date.getMonth()+1;
  var day = date.getDate();
  var year = date.getFullYear();
  return year + '-' +
    ((''+month).length<2 ? '0' : '') + month + '-' +
    ((''+day).length<2 ? '0' : '') + day;
}

app.post('/updateUser', function(request, response) {
  console.log('User being updated.');
  var user = request.body;
  console.log(user);
  if(!user.newPassword) {
    user.newPassword = user.password;
  }
  var query = database.query('UPDATE user SET password=PASSWORD(?), firstName=?, lastName=?, healthCardNumber=?, dateOfBirth=?, cancerType=?, cancerStage=?, tshRange=?, agreedToLegal=? '
    + 'WHERE email=? and password=PASSWORD(?)', [user.newPassword,
    user.firstName,
    user.lastName,
    user.healthCardNumber,
    formatDateOfBirth(user.dateOfBirth),
    user.cancerType,
    user.cancerStage,
    user.tshRange,
    user.agreedToLegal,
    user.email,
    user.password
  ], function(err, result) {
    if (err) {
      console.log(err);
      console.log(query.sql);
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