/*jshint multistr: true */


// Fonction appelée lorsque la page HTML est entièrement prête. Elle crée le
// modèle, abonne les fonctions d'affichage aux événements du modèle puis abonne
// le contrôleur aux événements utilisateur.
//
document.addEventListener('DOMContentLoaded', function () {
  var model = new Model();
  model.subscribers.push(renderUserCollectionView);
  model.subscribers.push(renderSelectedUserView);
  bindInputController(model);
});

// ## Classe Model

// Le modèle de l'application contient les fonctions abonnées à ses événements
// ainsi que toutes les données nécessaires à l'affichage de l'information: La
// liste d'utilisateurs github à afficher et l'utilisateur actuellement
// sélectionné.
//
function Model() {
  this.subscribers = [];
  this.users = [];
  this.selectedUser = null;
}

// ### notify

// Méthode de la classe Model. Appelle toute les fonctions abonnées au modèle.
//
Model.prototype.notify = function () {
  this.subscribers.forEach(function (each) {
    each(this);
  }.bind(this));
};

// ### addUser

// Méthode de la classe Model. Ajoute un utilisateur github à la liste
// d'utilisateurs, change l'utilisateur sélectionné puis avise toutes les
// fonctions abonnées.
//
Model.prototype.addUser = function (user) {
  this.users.push(user);
  this.selectedUser = user;
  this.notify();
};

// ### setSelectedUserByLogin

// Méthode la classe Model. Étant donné un identifiant github, retrouve l'objet
// dans la liste d'utilisateurs, change l'utilisateur sélectionné puis avise
// toutes les fonctions abonnées.
//
Model.prototype.setSelectedUserByLogin = function (login) {
  var found = this.users.filter(function (each) { return each.login === login; });
  if (found.length) {
    this.selectedUser = found[0];
    this.notify();
  }
};

// ## Fonctions de rendu

// ### renderUserCollectionView

// Une des fonctions abonnées aux événements du modèle. Elle reçoit le modèle
// entier en paramètre, en extrait la liste de modèles de type `user` et appelle
// la fonction `renderUserView` pour chacun. Les chaînes de caractères générées
// sont concaténées puis insérées dans l'élément HTML avec l'identifiant
// `user-collection`.
//
function renderUserCollectionView(model) {
  var el = document.getElementById('user-collection');
  var html = "<div>" + model.users.map(renderUserView).join('') + "</div>";
  el.innerHTML = html;
  bindUserController(model);
}

// ### renderSelectedUserView

// Une des fonctions abonnées aux événements du modèle. Elle reçoit le modèle
// entier en paramètre, en extrait l'utilisateur sélectionné, en construit une
// représentation HTML puis l'insère dans l'élément HTML avec l'identifiant
// `selected-user`.
//
function renderSelectedUserView(model) {
  var el = document.getElementById('selected-user');
  var user = model.selectedUser;
  var html = "<h2>"+ (user.name || user.login) +"</h2>";
  html += (user.location ? "<p><span class='glyphicon glyphicon-map-marker'></span> "+ user.location +"</p>" : "");
  html += (user.company ? "<p><span class='glyphicon glyphicon-briefcase'></span> "+ user.company +"</p>" : "");
  html += "<p><span class='glyphicon glyphicon-time'></span> Joined on "+ user.created_at.slice(0,10) +"</p>";
  html += "<h3>Repositories</h3>";
  html += user.repos.sort(sortByProperty('updated_at')).map(renderRepo).join('');
  el.innerHTML = html;
}


// ### renderRepo

// Reçoit en paramètre le modèle de type `repo` et produit une chaîne de
// caractères représentant ce modèle en HTML.
//
function renderRepo(repo) {
  var html = "\
    <h4><a href='"+ (repo.html_url) +"'>"+ (repo.name) +"</a> <small>"+ (repo.description) +"</small></h4>\
  ";
  return html;
}

// ### renderUserView

// Reçoit un modèle de type `user` en paramètre et produit une chaîne de
// caractères représentant ce modèle en HTML.
//
function renderUserView(user) {
  var html = "\
    <div class='media'>\
      <div class='media-left'>\
        <a href='#' class='user-link' data-login='"+ (user.login) +"'>\
          <img src='"+ (user.avatar_url) +"' style='width:64px;' class='img-circle'>\
        </a>\
      </div>\
      <div class='media-body'>\
        <h4 class='media-heading'>"+ (user.login) +"</h4>\
        <p>"+ (user.bio || user.name || user.company || user.location || user.created_at) +"</p>\
      </div>\
    </div>\
  ";
  return html;
}

// ## Fonction de contrôle

// ### bindInputController

// Fonction appelée à l'initialisation de l'application. Abonne une fonction à
// l'événement utilisateur "soumission du formulaire de recherche". Lorsque
// l'événement survient, la fonction récupère la valeur du champs de texte
// `user-input` puis déclenche la recherche (`fetchUser`).
//
function bindInputController(model) {
  var input = document.getElementById('user-input');
  var form = document.getElementById('user-search-form');
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    fetchUser(input.value.toLowerCase(), model.addUser.bind(model));
  });
}

// ### bindUserController

// Fonction appelée après que la liste d'utilisateur a été mise à jour à
// l'écran. Abonne une fonction à l'événement utilisateur "clic sur la photo de
// profil". Lorsque l'événement survient, la fonction récupère l'identifiant
// utilisateur de l'élément HTML cliqué (`login`) puis modifie le modèle.
//
function bindUserController(model) {
  var userLinks = document.getElementsByClassName('user-link');
  Array.prototype.forEach.call(userLinks, function(each) {
    each.addEventListener('click', function (e) {
      e.preventDefault();
      var login = each.getAttribute('data-login');
      model.setSelectedUserByLogin(login);
    });
  });
}

// ## Fonctions responsables des appels Ajax

// ### fetchUser

// Fonction appelée lors de la recherche d'un utilisateur github. La fonction
// prend en paramètre le nom d'utilisateur recherché (`candidate`) ainsi que la
// fonction à appellée lorsque la réponse HTTP sera retournée (`callback`).
// Construit l'URL vers le service de github et, lorsque la requête est
// complétée (`readyState === 4`) et que le statut de la réponse HTTP est 200
// (`status === 200`), interprète le contenue de la réponse HTTP en JSON puis
// déclenche un second appel Ajax.
//
function fetchUser(candidate, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('get', ('https://api.github.com/users/'+candidate+''), true);
  xhr.onreadystatechange = (function() {
    if (xhr.readyState === 4 && xhr.status === 200) {
      fetchUserRepos(JSON.parse(xhr.responseText), callback);
    }
  });
  xhr.send();
}

// ### fetchUserRepos

// Reçoit en paramètre un objet de type `user` obtenu par le service de github
// ainsi qu'une fonction à appelée quand la requête sera complétée (`callback`).
// L'URL du service est pris dans l'objet `user`. Lorsque la réponse est
// complétée avec succès, la fonction interprète la réponse reçue en JSON et
// l'ajoute à l'objet `user`. Finalement, la fonction appelle le `callback` en
// passant en paramètre l'objet `user`. Dans le cas de cette application, la
// variable `callback` pointe vers la méthode du modèle `addUser`.
//
function fetchUserRepos(user, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('get', user.repos_url, true);
  xhr.onreadystatechange = (function() {
    if (xhr.readyState === 4 && xhr.status === 200) {
      user.repos = JSON.parse(xhr.responseText);
      callback(user);
    }
  });
  xhr.send();
}

// ## Fonctions utilitaires

// ### sortByProperty

// Fonction permettant de trier des repos par rapport à l'une de leurs
// propriétés dont le nom est passé en paramètre.
//
function sortByProperty(prop) {
  return function comparator(repoA, repoB) {
    if (repoA[prop] < repoB[prop]) { return 1; }
    if (repoA[prop] > repoB[prop]) { return -1; }
    return 0;
  };
}
