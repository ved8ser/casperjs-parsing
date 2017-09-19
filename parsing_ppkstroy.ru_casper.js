var casper = require('casper').create({
  verbose: true,
  logLevel: 'info', /* [info, error, debug] */
  pageSettings: {
    loadImages: false,
    loadPlugins: false,
    userAgent: 'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.2 Safari/537.36'
  }
});

var extCasper = Object.create(casper);

var fs = require('fs');
var utils = require('utils');

var siteUrl = 'https://ppkstroy.ru';

var links = [];

function Product(_url) {
  this.name = "";
  this.url = _url;
}

Product.prototype.getName = function() {
  var _node = document.querySelector('.catalog .item h1');
  if ( _node && !!_node.textContent === true ) {
    return trim(_node.textContent);
  }
  return '';
}

extCasper.productList = [];

extCasper.logSelector = function(selector) {
  this.log("selector = '"+selector+"'", 'warning');
}

extCasper.getGroupLinks = function() {
  return this.evaluate(function() {
    return [].map.call(document.querySelectorAll('.catalog_menu .level1 a'), function(node) {
      return node.getAttribute('href');
    });
  });
}

extCasper.getSubGroupLinks = function() {
  return this.evaluate(function() {
    return [].map.call(document.querySelectorAll('.catalog .catalog-item a'), function(node) {
      return node.getAttribute('href');
    });
  });
}

extCasper.getProductLinks = function() {
  return this.evaluate(function() {
    return [].map.call(document.querySelectorAll('.catalog .object a.title'), function(node) {
      return node.getAttribute('href');
    });
  });
}

extCasper.processPageWithProducts = function() {
  var links = this.getProductLinks();
  // utils.dump(links);
  links.forEach(function(link) {
    link = siteUrl+link;
    extCasper.processPageProduct(link);
  });
}

extCasper.processPageWithSubGroups = function() {
  var links = this.getSubGroupLinks();
  // utils.dump(links);
  this.each(links, function(self, link) {
    link = siteUrl+link;
    self.thenOpen(link, function() {
      var _selector = '.page-content .catalog';
      this.logSelector(_selector);
      this.waitForSelector(_selector, function() {
        this.processPageWithProducts();
      });
    });
  });
}

extCasper.processPageProduct = function(link) {
  this.thenOpen(link, function() {
    var _selector = '.catalog .item';
    this.logSelector(_selector);
    this.waitForSelector(_selector, function() {
      var _product = new Product(link);
      _product.name = this.evaluate(_product.getName);
      this.productList.push(_product);
    });
  });
}

extCasper.saveJSON = function(data) {
  fs.write('json/ppkstroy.ru_products.json', JSON.stringify(data, null, '  '), 'w');
};

extCasper.start(siteUrl, function() {
  var _selector = '.catalog_menu .level1 a';
  this.logSelector(_selector);
  this.waitForSelector(_selector, function() {
    links = this.getGroupLinks();
  })
});

extCasper.then(function() {
  // utils.dump(links);
  links.forEach(function(link){
    link = siteUrl+link;
    extCasper.thenOpen(link, function() {
      var _selector = '.page-content .catalog';
      this.logSelector(_selector);
      this.waitForSelector(_selector, function() {
        var _selector = '.catalog .object a.title';
        this.logSelector(_selector);
        if (this.exists(_selector)) {
          this.processPageWithProducts();
        } else {
          this.processPageWithSubGroups()
        }
      });
    });
  });
});

extCasper.then(function() {
  this.saveJSON(this.productList);
});

extCasper.run();
