import { Meteor } from 'meteor/meteor';
import { SyncedCron } from 'meteor/percolate:synced-cron';
import { HTTP } from 'meteor/http';
import { check } from 'meteor/check';
import { Email } from 'meteor/email';
import cheerio from 'cheerio';

const Future = require('fibers/future');

let bookmyshowTheatresCount = 2;
let ticket4uTheatresCount = 1;

const CheckBookMyShow = () => {
  const url = `https://in.bookmyshow.com/buytickets/baahubali-2-the-conclusion-bengaluru/movie-bang-ET00038693-MT/20170428`;
  const res = Meteor.call('parseURLANDGetContent', url);
  if (res) {
    const $ = cheerio.load(res);
    let list = $("#venuelist li").map(function() {
      return $(this).data('name');
    }).toArray();

    if (list && list.length > bookmyshowTheatresCount) {
      list = list.reverse();

      const html = `Total theatres list:${list.join('<br>')}`
      Email.send({
        to: 'sasi.kanth80@gmail.com',
        from: 'no-reply@sasi.io',
        subject: 'New theatres were added to BookMyShow',
        html
      });
      bookmyshowTheatresCount = list.length;
    }
    return list;
  } else {
    Email.send({
      to: 'sasi.kanth80@gmail.com',
      from: 'no-reply@sasi.io',
      subject: 'Unable to get tickets from bookmyshow',
      text: 'Unable to get tickets from bookmyshow'
    });
    return true;
  }
};

const CheckTicket4u = () => {
  const url = `http://www.ticket4u.in/buytickets/?ct=BNG&tp=movies&tid=00000001337&date=2017-04-28`;
  const res = Meteor.call('parseURLANDGetContent', url);
  if (res) {
    const $ = cheerio.load(res);
    let list = $("div.mt-theatre .mt-theatrename").map(function() {
      return $(this).text();
    }).toArray();

    if (list && list.length > ticket4uTheatresCount) {
      list = list.reverse();

      const html = `Total theatres list:<br><br>${list.join('<br>')}`
      Email.send({
        to: 'sasi.kanth80@gmail.com',
        from: 'no-reply@sasi.io',
        subject: 'New theatres were added to Ticket4u',
        html
      });
      ticket4uTheatresCount = list.length;
    }
    return list;
  } else {
    Email.send({
      to: 'sasi.kanth80@gmail.com',
      from: 'no-reply@sasi.io',
      subject: 'Unable to get tickets from ticket4u',
      text: 'Unable to get tickets from ticket4u'
    });
    return true;
  }
};

Meteor.methods({
  parseURLANDGetContent(url) {
    check(url, String);
    const fut = new Future();
    HTTP.get(url, { timeout: 3000 }, (e, r) => {
      if (r && r.statusCode === 200) {
        fut.return(r.content);
      } else {
        console.log(e);
        fut.return(false);
      }
    });
    return fut.wait();
  },
  callMethod() {
    return CheckTicket4u();
  },
  testMail() {
    Email.send({
      to: 'sasi.kanth80@gmail.com',
      from: 'no-reply@sasi.io',
      subject: 'Checking BookMyShow website for tickets',
      text: 'Checking BookMyShow website for tickets'
    });
  },
});

SyncedCron.add({
  name: 'Check For Baahubali Tickets',
  schedule: function(parser) {
    // parser is a later.parse object
    return parser.text('every 5 minutes');
  },
  job: function() {
    CheckBookMyShow();
    CheckTicket4u();
    return true;
  }
});
