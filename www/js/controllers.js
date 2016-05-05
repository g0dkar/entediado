var resultados = [];
var pagination = null;
var lugarAtualIndex = -1;
var options = lsGet("options") || { radius: 5, type: null };
var optionsChanged = false;

function lsSet(key, value) {
	if (angular.isObject(value)) {
		localStorage.setItem(key, "o-" + JSON.stringify(value));
	}
	else if (typeof value === "number") {
		localStorage.setItem(key, "n-" + value);
	}
	else {
		localStorage.setItem(key, value);
	}
}

function lsGet(key) {
	var value = localStorage.getItem(key);
	if (value && value.length > 2 && value[1] === "-") {
		if (value[0] === "o") {
			try { return JSON.parse(value.substring(2)); } catch (e) { console.log("Erro ao pegar valor do LocalStorage", e); return null; }
		}
		else if (value[0] === "n") {
			return parseFloat(value.substring(2));
		}
		else {
			return value.substring(2);
		}
	}
	else {
		return value;
	}
}

angular.module("app.controllers", [])
	.controller("oQueTemPorAquiCtrl", function ($scope, $http, $q, $ionicLoading, $ionicPopup, $timeout, $state) {
		var maps, PlacesService, marker, markerAnimationTimeout;
		var loadingTimeout = null;

		$scope.lugar = null;

		$scope.proximo = proximo;

		$scope.selecionar = function () {
			if ($scope.lugar) {
				$state.go("tabs.detalhes");
			}
		};

		function proximo() {
			if (lugarAtualIndex >= 0 && lugarAtualIndex < resultados.length - 1) {
				lugarAtualIndex++;
				setResultado(lugarAtualIndex);
			}
			else {
				loadingTimeout = $timeout(function () { $ionicLoading.show(); }, 1500);

				if (pagination && pagination.hasNextPage) {
					pagination.nextPage();
				}
				else {
					navigator.geolocation.getCurrentPosition(function (position) {
						var lat = position.coords.latitude;
						var lng = position.coords.longitude;

						PlacesService.nearbySearch({
							location: { lat: lat, lng: lng },
							radius: options.radius * 1000,
							type: [tipoSuportado(options.type)]
						}, processarResultados);
					}, function () {
						$ionicPopup.alert({
							title: "Onde você está?",
							template: "Não conseguimos determinar sua localização. Seu GPS está ligado? Vamos continuar tentando. Por favor, ligue o GPS e aguarde :)"
						});
						if (!timeoutRetryProximo) { timeoutRetryProximo = $timeout(function () { timeoutRetryProximo = null; proximo(); }, 20000); }
					});
				}
			}
		};
		
		function tipoSuportado(tipo) {
			if (tipo === "__all" || tipo === "locality" || tipo === "political") {
				return null;
			}
			else {
				return tipo;
			}
		}

		var timeoutRetryProximo = null;
		function processarResultados(results, st, pag) {
			if (loadingTimeout) { $timeout.cancel(loadingTimeout); }
			$ionicLoading.hide();

			if (st !== google.maps.places.PlacesServiceStatus.OK) {
				$ionicPopup.alert({
					title: "Mais Lugares",
					template: "Não conseguimos carregar mais lugares. Está tudo certo com sua Internet? Vamos continuar tentando. Se acha que não foi nada, apenas aguarde :)"
				});
				if (!timeoutRetryProximo) { timeoutRetryProximo = $timeout(function () { timeoutRetryProximo = null; proximo(); }, 20000); }
				return;
			}
			else {
				pagination = pag;

				for (var i = 0; i < results.length; i++) {
					resultados.push(results[i]);
				}

				if (lugarAtualIndex === -1 || lugarAtualIndex >= resultados.length) {
					lugarAtualIndex = 0;
				}

				setResultado(lugarAtualIndex);
			}

			pagination = pag;
		}

		function setResultado(index) {
			if (marker) { marker.setMap(null); }
			if (markerAnimationTimeout) { clearTimeout(markerAnimationTimeout); }

			$scope.lugar = resultados[index];
			
			marker = new google.maps.Marker({
				map: maps,
				position: resultados[index].geometry.location,
				title: resultados[index].name,
				animation: google.maps.Animation.BOUNCE,
				icon: { url: resultados[index].icon }
			});

			maps.panTo(resultados[index].geometry.location);
			markerAnimationTimeout = setTimeout(function () { marker.setAnimation(null); markerAnimationTimeout = null; }, 3000);
		}

		$scope.$on("$ionicView.leave", function () {
			if (loadingTimeout) { $timeout.cancel(loadingTimeout); }
			if (timeoutRetryInitMaps) { $timeout.cancel(timeoutRetryInitMaps); }
			if (timeoutRetryProximo) { $timeout.cancel(timeoutRetryProximo); }
			$ionicLoading.hide();
		});

		$scope.$on("$ionicView.enter", function () {
			if (!maps) {
				$ionicLoading.show();
				initMaps();
			}
			else if (optionsChanged) {
				$ionicLoading.show();
				lugarAtualIndex = -1;
				optionsChanged = false;
				pagination = null;
				resultados = [];
				proximo();
			}
		});
		
		var timeoutRetryInitMaps = null;
		function initMaps(first) {
			navigator.geolocation.getCurrentPosition(function (position) {
				var lat = position.coords.latitude;
				var lng = position.coords.longitude;
				
				maps = new google.maps.Map(document.getElementById("mapa-lugares"), {
					center: { lat: lat, lng: lng },
					zoom: 18,
					disableDefaultUI: true
				});
				PlacesService = new google.maps.places.PlacesService(maps);
				
				proximo();
			}, function () {
				$ionicPopup.alert({
					title: "Onde você está?",
					template: "Não conseguimos determinar sua localização. Seu GPS está ligado? Vamos continuar tentando. Por favor, ligue o GPS e aguarde :)"
				});
				if (!timeoutRetryInitMaps) { timeoutRetryInitMaps = $timeout(function () { timeoutRetryInitMaps = null; initMaps(); }, 20000); }
			});
		}
	})

	.controller("configuracoesCtrl", function ($scope) {
		$scope.options = options;

		var rangeDistancia = document.getElementById("distancia");
		angular.element(rangeDistancia).on("input", function () {
			$scope.$apply(function () {
				options.radius = parseInt(rangeDistancia.value);
			});
		});

		$scope.$watch("options.radius", function (newValue) {
			if (newValue != undefined) {
				options.radius = Math.max(Math.min(parseInt(newValue), 50), 1);
				rangeDistancia.value = options.radius;
				lsSet("options", options);
				optionsChanged = true;
			}
		});

		$scope.$watch("options.type", function (newValue) {
			if (newValue) {
				if (newValue === "locality" || newValue === "political") {
					$ionicPopup.alert({
						title: "Não suportado",
						template: "O Google Maps infelizmente não suporta o tipo de lugar selecionado. Utilizaremos \"Todos\", ok? Desculpe por isso :("
					});
					newValue = "__all";
				}
				
				options.type = newValue;
				lsSet("options", options);
				optionsChanged = true;
			}
			else {
				options.type = null;
			}
		});

		$scope.todosTipos = TIPOS;
	})

	.controller("detalhesCtrl", function ($scope) {
		$scope.link = function (str) { return encodeURIComponent(str); };

		function imagemLugar() {
			if ($scope.lugar) {
				if ($scope.lugar.photos && $scope.lugar.photos.length > 0) {
					return $scope.lugar.photos[0].getUrl({ maxWidth: 400 });
				}
				else {
					return "http://placehold.it/400x200?text=" + encodeURIComponent($scope.lugar.name);
				}
			}
			else {
				return null;
			}
		};

		$scope.imagemLugar = imagemLugar;

		function irParaLugar() {
			navigator.geolocation.getCurrentPosition(function (position) {
				var lat = position.coords.latitude;
				var lng = position.coords.longitude;
				
				try {
					launchnavigator.navigate($scope.lugar.vicinity);
				} catch (e) {
					$ionicPopup.show({title:"pey",template:"explodiu: " + e});
					window.open("google.navigation:q=" + encodeURIComponent($scope.lugar.vicinity), "_system");
				}
			}, function () {
				window.open("google.navigation:q=" + encodeURIComponent($scope.lugar.vicinity), "_system");
			});
		}

		$scope.irParaLugar = irParaLugar;

		$scope.$on("$ionicView.enter", function () {
			console.log("Exibindo:", resultados[lugarAtualIndex]);
			$scope.lugar = resultados[lugarAtualIndex];
		});

		function tipoLugar(tipo) {
			if (tipo in TIPOS) {
				return TIPOS[tipo];
			}
			else {
				return "Tipo Desconhecido: " + tipo;
			}
		}

		$scope.tipoLugar = tipoLugar;
	});

var TIPOS = {
	__all: "Todos",
	accounting: "Contabilidade",
	airport: "Aeroporto",
	amusement_park: "Parque de Diversões",
	aquarium: "Aquário",
	art_gallery: "Galeria de Arte",
	atm: "Caixa Automático (ATM)",
	bakery: "Padaria / Boleria",
	bank: "Banco",
	bar: "Bar",
	beauty_salon: "Salão de Beleza",
	bicycle_store: "Loja de Bicicletas",
	book_store: "Livraria",
	bowling_alley: "Boliche",
	bus_station: "Estação de Ônibus",
	cafe: "Café",
	campground: "Campo",
	car_dealer: "Revendedora de Carros",
	car_rental: "Alguel de Carros",
	car_repair: "Reparo de Carros",
	car_wash: "Limpeza de Carros",
	casino: "Cassino",
	cemetery: "Cemitério",
	church: "Igreja",
	city_hall: "Prefeitura",
	clothing_store: "Loja de Roupas",
	convenience_store: "Loja de Conveniência",
	courthouse: "Tribunal",
	dentist: "Dentista",
	department_store: "Loja de Departamentos",
	doctor: "Médico",
	electrician: "Eletricista",
	electronics_store: "Loja de Eletrônicos",
	embassy: "Embaixada",
	establishment: "Estabelecimento Comercial",
	finance: "Estabelecimento Financeiro",
	fire_station: "Bombeiros",
	florist: "Florista",
	food: "Alimentação",
	funeral_home: "Funerária",
	furniture_store: "Loja de Decorações",
	gas_station: "Posto de Combustível",
	general_contractor: "Construção Civil",
	grocery_or_supermarket: "Supermercado ou Mercado",
	gym: "Academia",
	hair_care: "Centro de Cuidado com Cabelos",
	hardware_store: "Loja de Equipamentos",
	health: "Saúde",
	hindu_temple: "Templo Hindú",
	home_goods_store: "Loja de Bens Domésticos",
	hospital: "Hospital",
	insurance_agency: "Agência de Seguros",
	jewelry_store: "Joalheria",
	laundry: "Lavanderia",
	lawyer: "Advogado",
	library: "Biblioteca",
	liquor_store: "Loja de Bebidas",
	local_government_office: "Escritório do Governo do Estado",
	locksmith: "Chaveiro",
	lodging: "Hotelaria",
	meal_delivery: "Faz Entrega de Alimentos",
	meal_takeaway: "Faz 'Para Viagem'",
	mosque: "Mesquita",
	movie_rental: "Locadora de Filmes",
	movie_theater: "Cinema",
	moving_company: "Empresa de Mudanças",
	museum: "Museu",
	night_club: "Clube/Casa Noturna",
	painter: "Pintor",
	park: "Parque",
	parking: "Estacionamento",
	pet_store: "Loja para Animais de Estimação (Pet Shop)",
	pharmacy: "Farmácia",
	physiotherapist: "Fisioterapêuta",
	place_of_worship: "Lugar de Oração",
	plumber: "Encanador",
	police: "Polícia",
	post_office: "Correios",
	real_estate_agency: "Imobiliária",
	restaurant: "Restaurante",
	roofing_contractor: "Construção Civil",
	rv_park: "Estacionamento",
	school: "Escola",
	shoe_store: "Sapataria",
	shopping_mall: "Shopping Center",
	spa: "SPA",
	stadium: "Estádio",
	storage: "Armazém",
	store: "Loja",
	subway_station: "Estação de Metrô",
	synagogue: "Sinagoga",
	taxi_stand: "Ponto de Táxi",
	train_station: "Estação de Trem",
	transit_station: "Estação de Trânsito",
	travel_agency: "Agência de Viagem",
	university: "Universidade",
	veterinary_care: "Cuidados Veterinários",
	zoo: "Zoológico",
	point_of_interest: "Ponto de Interesse",
	locality: "Localidade",
	political: "Divisão Política (Geográfica)"
};