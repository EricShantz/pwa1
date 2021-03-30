import {
  get,
  set,
  getMany,
  setMany,
  update,
  del,
  clear,
  keys,
  values,
  entries,
  createStore,
} from 'https://cdn.jsdelivr.net/npm/idb-keyval@5/dist/esm/index.js';

const APP = {
  BASE_URL: 'https://api.themoviedb.org/3/',
  IMG_URL: 'https://image.tmdb.org/t/p/',
  backdrop_sizes: ['w300', 'w780', 'w1280', 'original'],
  logo_sizes: ['w45', 'w92', 'w154', 'w185', 'w300', 'w500', 'original'],
  poster_sizes: ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original'],
  profile_sizes: ['w45', 'w185', 'h632', 'original'],
  still_sizes: ['w92', 'w185', 'w300', 'original'],
  API_KEY: '"1548820d416f15b2d6609bd2fa9d9de7"',
  isOnline: 'onLine' in navigator && navigator.onLine,
  isStandalone: false,
  sw: null, //your service worker
  db: null, //your database
  movieStore: null,
  dbVersion: 3,
  
  init() {

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        console.log("service worker registered")
    }
    APP.openDB();     
    //APP.pageLoaded();    
    APP.addListeners();    

    if (navigator.standalone) {   
      APP.isStandalone = true;
    } else if (matchMedia('(display-mode: standalone)').matches) {
      APP.isStandalone = true;
    } else {
      APP.isStandalone = false;
    }
  },

  pageLoaded() {
    console.log("IM A PAGE AND IM LOADED")
    //page has just loaded and we need to check the queryString
    //based on the querystring value(s) run the page specific tasks
    // console.log('page loaded and checking', location.search);
    let params = new URL(document.location).searchParams;
    let keyword = params.get('keyword');
    if (keyword) {
      //means we are on results.html
      console.log(`on results.html - startSearch(${keyword})`);
      APP.startSearch(keyword);
    }
    let mid = parseInt(params.get('movie_id'));
    let ref = params.get('ref');
    if (mid && ref) {
      //we are on suggest.html
      console.log(`look in db for movie_id ${mid} or do fetch`);
      APP.startSuggest({ mid, ref });
    }

    APP.saveMovieToDB(keyword)
    //call a fetch function
  },

  addListeners() {
    //TODO:
    //listen for on and off line events
    document.getElementById("searchForm").addEventListener("submit" , (ev) =>{
      ev.preventDefault() //is this actually doing anything?
      APP.formSubmission(ev)
    })

    //TODO:
    //listen for Chrome install prompt
    //handle the deferredPrompt

    //listen for sign that app was installed
    window.addEventListener('appinstalled', (evt) => {
      console.log('app was installed');
    });

    //listen for submit of the search form
    let searchForm = document.searchForm;
    if (searchForm) {
      document.searchForm.addEventListener('submit', (ev) => {
        ev.preventDefault();
        //build the queryString and go to the results page
        let searchInput = document.getElementById('search');
        let keyword = searchInput.value.trim();
        if (keyword) {
          let base = location.origin;
          let url = new URL('./results.html', base);
          url.search = '?keyword=' + encodeURIComponent(keyword);
          location.href = url;
        }
      });
    }

    //listen for the click of movie div
    //to handle clicks of the suggest a movie buttons
    let movies = document.querySelector('.movies');
    if (movies) {
      //navigate to the suggested page
      //build the queryString with movie id and ref title
      movies.addEventListener('click', (ev) => {
        ev.preventDefault();
        let anchor = ev.target;
        if (anchor.tagName === 'A') {
          let card = anchor.closest('.card');
          let title = card.querySelector('.card-title span').textContent;
          let mid = card.getAttribute('data-id');
          let base = location.origin;
          let url = new URL('./suggest.html', base);
          url.search = `?movie_id=${mid}&ref=${encodeURIComponent(title)}`;
          location.href = url;
        }
      });
    }
  },

  sendMessage(msg, target) {
    //TODO:
    //send a message to the service worker
  },

  onMessage({ data }) {
    //TODO:
    //message received from service worker
  },

  startSearch(keyword) {
    //TODO: check in IDB for movie results
    if (keyword) {
      //check the db (movie store)
      //if no matches make a fetch call to TMDB API
      //or make the fetch call and intercept it in the SW
      let url = `${APP.BASE_URL}search/movie?api_key=${APP.API_KEY}&query=${keyword}`;

      APP.getData(url, (data) => {
        //this is the CALLBACK to run after the fetch
        APP.results = data.results;
        APP.useSearchResults(keyword);
      });
    }
  },

  useSearchResults(keyword) {
    //after getting fetch or db results
    //display search keyword in title
    //then call buildList
    let movies = APP.results;
    let keywordSpan = document.querySelector('.ref-keyword');
    if (keyword && keywordSpan) {
      keywordSpan.textContent = keyword;
    }
    APP.buildList(movies);
  },

  startSuggest({ mid, ref }) {
    //TODO: Do the search of IndexedDB for matches
    //if no matches to a fetch call to TMDB API
    //or make the fetch call and intercept it in the SW

    let url = `${APP.BASE_URL}movie/${mid}/similar?api_key=${APP.API_KEY}&ref=${ref}`;
    //TODO: choose between /similar and /suggested endpoints from API

    APP.getData(url, (data) => {
      //this is the callback that will be used after fetch
      APP.suggestedResults = data.results;
      APP.useSuggestedResults(ref);
    });
  },

  useSuggestedResults(ref) {
    //after getting fetch/db results
    //display reference movie name in title
    //then call buildList
    let movies = APP.suggestedResults;
    let titleSpan = document.querySelector('#suggested .ref-movie');
    console.log('ref title', ref);
    if (ref && titleSpan) {
      titleSpan.textContent = ref;
    }
    APP.buildList(movies);
  },

  async getData(keyword){
    let URL = `${APP.BASE_URL}search/movie?api_key=${APP.API_KEY}&query=${keyword}`;
    console.log(URL , "IM A URL")
    const response = await fetch(URL)

    try{
      if(response.ok){
        let movieResults = {
          keyword: keyword, 
          results: await response.json()
        }
        console.log("HEEEY  IM IN GET DATA AFTER THE OBJECT THING WEEEEEEEE")
        APP.saveMovieToDB(movieResults);
      } else{
        throw new Error(response.message)
      }


    } catch(err){
      console.warn(err)
    }
    // fetch(url)
    //   .then((resp) => {
    //     if (resp.ok) {
    //       return resp.json();
    //     } else {
    //       let msg = resp.statusText;
    //       throw new Error(`Could not fetch movies. ${msg}.`);
    //     }
    //   })
    //   .then((data) => {
    //     //callback
    //     cb(data);
    //     console.log("DATA.RESULTS : " , data.results)
    //   })
    //   .catch((err) => {
    //     console.warn(err);
    //     cb({ code: err.code, message: err.message, results: [] });
    //   });
  },

  buildList: (movies) => {
    //build the list of cards inside the current page
    let movieDiv = document.querySelector(".movies")
    movieDiv.innerHTML = ""
    console.log("MOVIES!" , movies)

    console.log(`show ${movies.length} cards`);
    let container = document.querySelector(`.movies`);
    //TODO: customize this HTML to make it your own
    if (container) {
      if (movies.length > 0) {
        container.innerHTML = movies
          .map((obj) => {
            let img = './img/icon-512x512.png';
            if (obj.poster_path != null) {
              img = APP.IMG_URL + 'w500/' + obj.poster_path;
            }
            return `<div class="card hoverable large" data-id="${obj.id}">
          <div class="card-image">
            <img src="${img}" alt="movie poster" class="notmaterialboxed"/>
            </div>
          <div class="card-content activator">
            <h3 class="card-title"><span>${obj.title}</span><i class="material-icons right">more_vert</i></h3>
          </div>
          <div class="card-reveal">
            <span class="card-title grey-text text-darken-4">${obj.title}<i class="material-icons right">close</i></span>
            <h6>${obj.release_date}</h6>
            <p>${obj.overview}</p>
          </div>
          <div class="card-action">
            <a href="#" class="find-suggested light-blue-text text-darken-3">Show Similar<i class="material-icons right">search</i></a>
          </div>
        </div>`;
          })
          .join('\n');
      } else {
        //no cards
        container.innerHTML = `<div class="card hoverable">
          <div class="card-content">
            <h3 class="card-title activator"><span>No Content Available.</span></h3>
          </div>
        </div>`;
      }
    }
  },

  openDB() {
    let DBOpenReq = indexedDB.open("APP_DB" , APP.dbVersion)

    DBOpenReq.addEventListener("success" , ev => {
      APP.db = ev.target.result
      console.log("FUYCK YEAH! DB success" , APP.db)
    })

    DBOpenReq.addEventListener("upgradeneeded" , ev=>{
      APP.db = ev.target.result
      console.log("DB upgrade" , APP.db)

      let oldVersion = ev.oldVersion
      let newVersion = ev.newVersion || APP.db.dbVersion
      console.log(`DB updated from ${oldVersion} to ${newVersion}`)

      if(!APP.db.objectStoreNames.contains('movieStore' && 'suggestionStore')) { 
        APP.movieStore = APP.db.createObjectStore('movieStore', {keyPath: 'keyword'})
        APP.db.createObjectStore('suggestionStore', {keyPath: 'id'})
      }}),

    

    //error listener
    DBOpenReq.addEventListener("error" , err =>{
      console.warn(err)
    })
    //save db reference as APP.db

  },

  formSubmission(ev){
    console.log(`EVENT : ${ev}`)
    ev.preventDefault()
    const keyword = ev.target.search.value
    window.location.href = `/results.html?keyword=${keyword}`
    APP.pageLoaded();
    APP.getData(keyword)
  },

  saveMovieToDB(movieResults){
    let tx = APP.db.transaction("movieStore" , "readwrite")
    tx.oncomplete = (ev) =>{
      console.log("On completed triggered")
    }
    tx.onerror = (err)=>{
      console.warn(err)
    }
    
    let store = tx.objectStore("movieStore")
    let request = store.add(movieResults)

    request.onsuccess = (ev) =>{
      console.log("succesfully added an object" , ev)
    }

    request.oncomplete = ev=>{
      console.log("Transaction completed: " , ev)
      // APP.buildList()
    }

    request.onerror = err=>{
      console.warn(err)
    }
  },

  createTX(storeName , mode){
    console.log(APP.db)
    let tx = APP.db.transaction(storeName , mode);
      tx.onerror = err =>{
        console.warn(err)
      }
    return tx
  },
};

document.addEventListener('DOMContentLoaded', APP.init);
