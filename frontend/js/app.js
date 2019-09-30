const app = {};

const btoa_ext = buf => Buffer.Buffer.from(buf).toString('base64');

app.slpdb = {
  query: (query) => new Promise((resolve, reject) => {
    if (! query) {
      return resolve(false);
    }
    const b64 = btoa_ext(JSON.stringify(query));
    const url = "https://slpdb.fountainhead.cash/q/" + b64;

    console.log(url)

    fetch(url)
    .then((r) => r = r.json())
    .then((r) => {
      if (r.hasOwnProperty('error')) {
        reject(new Error(r['error']));
      }
      resolve(r);
    });
  }),

  addresses_holding_token: (tokenIdHex, addresses) => ({
    "v": 3,
    "q": {
      "db": ["a"],
      "find": {
        "tokenDetails.tokenIdHex": "4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf",
        "address": {
          "$in": addresses
        }
      },
      "limit": 10
    }
  }),
};

app.init_index_page = () =>
  new Promise((resolve, reject) => {

    app.slpdb.query(app.slpdb.addresses_holding_token(voteTokenIdHex, teams.map(team => team.address)))
	.then((addresses) => {
      console.log(addresses.a);

      teams.forEach((team) => {
        team.votes = 0;
        for (const v of addresses.a) {
          if (v.address === team.address) {
            team.votes = v.token_balance;
          }
        }

        $('#projects-table tbody').append(app.template.team(team));
      });

      resolve();
    });
  })
  
app.router = (whash, push_history = true) => {
  if (! whash) {
    whash = window.location.hash.substring(1);
  }

  const [_, path, key] = whash.split('/');


  let method = null;

  switch (path) {
    case '':
    case '#':
      document.title = 'SLPVH Voting';
      method = () => {
          $('html').addClass('index-page');
          return app.init_index_page();
      };
      break;
    default:
      document.title = '404 | SLPVH Voting';
      console.error('app.router path not found', whash);
      method = () => app.init_404_page();
      break;
  }

  $('html').removeClass();
  $('html').scrollTop(0);

  method().then(() => {
    $('html').removeClass('loading');
    $('footer').removeClass('display-none');
  });
}

$(document).ready(() => {
  $(window).on('popstate', (e) => {
    app.router(window.location.pathname+window.location.hash, false);
  });

  const views = [
    'team',
  ];

  app.template = {}

  console.time('loading views');
  Promise.all(views.map(v => {
    const url = 'views/' + v + '.ejs';
    console.info('downloading view: ' + url);
    return fetch(url).then(v => v.text())
  }))
  .then(texts => {
    texts.forEach((v, i) => {
      console.info('compiling: ' + views[i]);
      app.template[views[i]] = ejs.compile(v);
    });
  })
  .then(() => {
    console.timeEnd('loading views');
    app.router(window.location.pathname+window.location.hash, false);
    $('header').removeClass('loading');
  });
});
