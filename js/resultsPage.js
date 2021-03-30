import { openDB, deleteDB, wrap, unwrap } from '/node_modules/idb';



const RESULTS = {
    IMG_URL: "https://image.tmdb.org/t/p/",
    db: null,
    movieStore: null,
    dbVersion: 4,

    //RESULTS.db = ev.target.result;


    async buildList(){
    console.log("IM BUILDING A LIST");

    function getParameterByName(name) {
        var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
        return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
    }


        let movies = await openDB(getAll(getParameterByName("keyword")))

        RESULTS.buildCard(movies)
    },
    
    buildCard(movies){
    //build the list of cards inside the current page
    let movieDiv = document.querySelector(".movies");
    movieDiv.innerHTML = "";
    console.log("MOVIES!", movies);

    console.log(`show ${movies.length} cards`);
    let container = document.querySelector(`.movies`);
    //TODO: customize this HTML to make it your own
    if (container) {
        if (movies.length > 0) {
        container.innerHTML = movies
            .map((obj) => {
            let img = "./img/icon-512x512.png";
            if (obj.poster_path != null) {
                img = RESULTS.IMG_URL + "w500/" + obj.poster_path;
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
            .join("\n");
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

    createTX(storeName, mode) {
        console.log(RESULTS.db);
        let tx = RESULTS.db.transaction(storeName, mode);
        tx.onerror = (err) => {
        console.warn(err);
        };
        return tx;
    },
};

document.addEventListener('DOMContentLoaded' , RESULTS.buildList)
