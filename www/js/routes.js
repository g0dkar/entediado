angular.module('app.routes', [])

.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider
    
  

      .state('tabs.oQueTemPorAqui', {
    url: '/lugares',
    views: {
      'tab2': {
        templateUrl: 'templates/oQueTemPorAqui.html',
        controller: 'oQueTemPorAquiCtrl'
      }
    }
  })

  .state('tabs.configuracoes', {
    url: '/config',
    views: {
      'tab3': {
        templateUrl: 'templates/configuracoes.html',
        controller: 'configuracoesCtrl'
      }
    }
  })

  .state('tabs', {
    url: '/',
    templateUrl: 'templates/tabs.html',
    abstract:true
  })

  .state('tabs.detalhes', {
    url: '/detalhes',
    views: {
      'tab2': {
        templateUrl: 'templates/detalhes.html',
        controller: 'detalhesCtrl'
      }
    }
  })

$urlRouterProvider.otherwise('//lugares')

  

});