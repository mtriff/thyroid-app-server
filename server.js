var express = require('express');
var mysql = require('mysql');
var database = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  database: 'thyroidApp'
});
database.connect();

//CORS Middleware, causes Express to allow Cross-Origin Requests
var allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  next();
}

var app = express();
app.use(express.bodyParser());
app.use(allowCrossDomain);

// Get all records associated with the given user
app.post('/getRecords', function(request, response) {
  console.log('Sending records');
  if (!request.body.email || !request.body.password) {
    return response.send(400, 'Missing log in information.');
  }
  getRecords(request, function(err, result) {
    return response.send(200, result);
  });
});

// Helper function to get all records for a given user
function getRecords(request, callback) {
  console.log('Retrieving records.')
  var query = database.query('SELECT records.date, records.tsh, records.tg, records.synthroidDose '
    + ' FROM records, user ' + 'WHERE records.user=user.email' + ' AND user.email=? AND user.password=PASSWORD(?)' + ' ORDER BY records.date DESC', [request.body.email,
    request.body.password
  ], callback);
}

// Updates the records in the database with the provided records
app.post('/syncRecords', function(request, response) {
  console.log('Save Records Request Received.');

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
    getRecords(request, function() {
      var newRecords = request.body.newRecords;
      var recordsToSave = [];
      for (var i = 0; i < newRecords.length; i++) {
        var newRecord = [request.body.email, newRecords[i].date, newRecords[i].tsh, newRecords[i].tg, newRecords[i].synthroidDose];
        recordsToSave.push(newRecord);
      }
      syncRecords(request, response, recordsToSave);
    });
  });
});

// Helper function to remove all old records and insert all new records
//  We do this instead of a combination of UPDATE and
//  INSERT statements to simplify this process
function syncRecords(request, response, recordsToSave) {
  var deleteQuery = database.query('DELETE FROM records WHERE user=?', [request.body.email], function(err, result) {
    if(err) {
      return response.send(400, 'Error occurred syncing records');
    }
    var insertQuery = database.query('INSERT INTO records (user, date, tsh, tg, synthroidDose) VALUES ?', [recordsToSave], function(err, result) {
      if(err) {
        return response.send(400, 'Error occurred syncing records');
      }
      return response.send(200, 'Records synced.');
    });
  });
}

// Uses a email address and password to retrieve a user from the database
app.post('/login', function(request, response) {
  console.log('Logging user in');

  if (!request.body.email || !request.body.password) {
    return response.send(400, 'Missing log in information.');
  }

  var query = database.query('SELECT * ' 
    + ' FROM user ' 
    + 'WHERE user.email=? AND user.password=PASSWORD(?)', [request.body.email,
    request.body.password
  ], function(err, result) {
    if(!result.length) {
      return response.send(400, 'Invalid password and email provided.');
    }
    delete result[0].password;
    return response.send(200, result[0]);
  });
});

// Creates a new user in the database
app.post('/saveNewUser', function(request, response) {
  console.log('New user being created.');
  var user = request.body.newUser;
  var query = database.query('INSERT INTO user VALUES (?, PASSWORD(?), ?, ?, ?, ?, ?, ?, ?, ?)', [user.email,
    user.newPassword,
    user.firstName,
    user.lastName,
    user.healthCardNumber,
    user.dateOfBirth,
    user.cancerType,
    user.cancerStage,
    user.tshRange,
    false // agreedToLegal
  ], function(err, result) {
    if (err) {
      return response.send(400, 'An error occurred creating this user.');
    }
    return response.json(200, 'User created successfully!');
  });
});

// Same as front end code, used to format a Date object appropriately
function formatDateOfBirth(dateString) {
  var date = new Date(dateString);
  var month = date.getMonth()+1;
  var day = date.getDate();
  var year = date.getFullYear();
  return year + '-' +
    ((''+month).length<2 ? '0' : '') + month + '-' +
    ((''+day).length<2 ? '0' : '') + day;
}

// Update user information
app.post('/updateUser', function(request, response) {
  console.log('User being updated.');
  var user = request.body;
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
      return response.send(400, 'An error occurred creating this user.');
    }
    return response.json(200, 'User created successfully!');
  });
});

// Close the database connection and server when the application ends
process.on('SIGTERM', function() {
  console.log("Shutting server down.");
  database.end();
  app.close();
});

var server = app.listen(3000, function() {
  console.log('Listening on port %d', server.address().port);
});