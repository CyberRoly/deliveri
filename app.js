// app.js - Módulo principal que coordina todos los componentes
import { Catalog } from './modules/catalog.js';
import { Cart } from './modules/cart.js';
import { Checkout } from './modules/checkout.js';
import { Payments } from './modules/payments.js';
import { WhatsApp } from './modules/whatsapp.js';
import { Admin } from './modules/admin.js';
import { Utils } from './modules/utils.js';

class DeliveryApp {
    constructor() {
        this.utils = new Utils();
        this.config = {};
        this.products = [];
        this.modules = {};
        this.currentSection = 'catalogo';
        
        this.init();
    }

    async init() {
        try {
            // Cargar configuración
            await this.loadConfig();
            
            // Cargar productos
            await this.loadProducts();
            
            // Inicializar módulos
            this.initModules();
            
            // Configurar eventos
            this.setupEventListeners();
            
            // Cargar estado desde localStorage
            this.loadState();
            
            // Mostrar toast de bienvenida
            this.utils.showToast('Sistema de delivery cargado correctamente');
            
            // Registrar service worker para PWA
            this.registerServiceWorker();
            
        } catch (error) {
            console.error('Error inicializando la aplicación:', error);
            this.utils.showToast('Error cargando la aplicación', 'error');
        }
    }

    async loadConfig() {
        try {
            const response = await fetch('data/config.json');
            if (!response.ok) throw new Error('Error cargando configuración');
            this.config = await response.json();
            
            // Validar configuración mínima
            if (!this.config.whatsappNumber) {
                console.warn('Número de WhatsApp no configurado');
            }
        } catch (error) {
            // Configuración por defecto
            this.config = {
                whatsappNumber: '',
                sucursales: [
                    { id: 'centro', nombre: 'Centro', costo: 20 },
                    { id: 'playa', nombre: 'Playa', costo: 30 }
                ],
                qrOptions: [],
                transferencia: {}
            };
            console.warn('Usando configuración por defecto');
        }
    }

    async loadProducts() {
        try {
            const response = await fetch('data/products.json');
            this.productos = await response.json();
            this.renderProductos();
            if (!response.ok) throw new Error('Error cargando productos');
            this.products = await response.json();
        } catch (error) {
            // Productos de demo
            this.products = this.getDemoProducts();
            console.warn('Usando productos de demostración');
        }
    }

    getDemoProducts() {
        return [
            {
                id: 1,
                nombre: "Café Cubano",
                descripcion: "Café espresso tradicional cubano",
                precio: 20,
                categoria: "bebidas",
                imagen: "assets/productos/cafe.jpg",
                activo: true
            },
            {
                id: 2,
                nombre: "Pan con Lechón",
                descripcion: "Pan cubano con lechón asado",
                precio: 120,
                categoria: "comida",
                imagen: "assets/productos/pan.jpg",
                activo: true
            },
            {
                id: 3,
                nombre: "Tostones",
                descripcion: "Plátanos verdes fritos",
                precio: 80,
                categoria: "comida",
                imagen: "assets/productos/tostones.jpg",
                activo: true
            },
            {
                id: 4,
                nombre: "Mojito",
                descripcion: "Cóctel tradicional cubano",
                precio: 150,
                categoria: "bebidas",
                imagen: "assets/productos/mojito.jpg",
                activo: true
            },
            {
                id: 5,
                nombre: "Arroz Congrí",
                descripcion: "Arroz con frijoles negros",
                precio: 90,
                categoria: "comida",
                imagen: "assets/productos/congri.jpg",
                activo: true
            },
            {
                id: 6,
                nombre: "Refresco de Mango",
                descripcion: "Refresco natural de mango",
                precio: 40,
                categoria: "bebidas",
                imagen: "assets/productos/mango.jpg",
                activo: true
            },
            {
                id: 7,
                nombre: "Yuca con Mojo",
                descripcion: "Yuca con salsa de mojo criollo",
                precio: 70,
                categoria: "comida",
                imagen: "assets/productos/yuca.jpg",
                activo: true
            },
            {
                id: 8,
                nombre: "Flan de Coco",
                descripcion: "Postre tradicional de coco",
                precio: 60,
                categoria: "postres",
                imagen: "assets/productos/flan.jpg",
                activo: true
            }
        ];
    }

    initModules() {
        // Inicializar módulos con las dependencias necesarias
        this.modules.catalog = new Catalog(this.products, this);
        this.modules.cart = new Cart(this.config, this);
        this.modules.checkout = new Checkout(this.config, this);
        this.modules.payments = new Payments(this.config, this);
        this.modules.whatsapp = new WhatsApp(this.config, this);
        this.modules.admin = new Admin(this.config, this.products, this);
        
        // Inicializar cada módulo
        Object.values(this.modules).forEach(module => {
            if (module.init) module.init();
        });
    }

    setupEventListeners() {
        // Navegación entre secciones
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.switchSection(section);
            });
        });

        // Botón proceder al checkout desde carrito
        document.getElementById('proceed-checkout')?.addEventListener('click', () => {
            if (this.modules.cart.getItems().length === 0) {
                this.utils.showToast('El carrito está vacío', 'error');
                return;
            }
            this.switchSection('checkout');
        });

        // Botón volver al carrito desde checkout
        document.getElementById('back-to-cart')?.addEventListener('click', () => {
            this.switchSection('carrito');
        });

        // Botón proceder al pago desde checkout
        document.getElementById('proceed-payment')?.addEventListener('click', () => {
            if (this.modules.checkout.validateForm()) {
                this.switchSection('pagos');
            }
        });

        // Botón volver al checkout desde pagos
        document.getElementById('back-to-checkout')?.addEventListener('click', () => {
            this.switchSection('checkout');
        });

        // Cambio de tema
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Toggle menú móvil
        document.querySelector('.menu-toggle')?.addEventListener('click', () => {
            this.toggleMobileMenu();
        });

        // Cerrar modal
        document.getElementById('modal-cancel')?.addEventListener('click', () => {
            this.utils.hideModal();
        });
    }

    switchSection(section) {
        // Ocultar todas las secciones
        document.querySelectorAll('.section').forEach(sec => {
            sec.hidden = true;
        });
        
        // Mostrar sección seleccionada
        const targetSection = document.getElementById(section);
        if (targetSection) {
            targetSection.hidden = false;
        }
        
        // Actualizar navegación activa
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === section) {
                link.classList.add('active');
            }
        });
        
        // Actualizar variable de estado
        this.currentSection = section;
        
        // Llamar a funciones específicas de la sección
        switch(section) {
            case 'carrito':
                this.modules.cart.updateDisplay();
                break;
            case 'checkout':
                this.modules.checkout.updateZonaSelect();
                break;
            case 'pagos':
                this.modules.payments.updatePaymentDisplay();
                break;
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.utils.showToast(`Tema ${newTheme === 'dark' ? 'oscuro' : 'claro'} activado`);
    }

    toggleMobileMenu() {
        const nav = document.querySelector('.main-nav');
        const toggle = document.querySelector('.menu-toggle');
        const expanded = nav.classList.toggle('expanded');
        toggle.setAttribute('aria-expanded', expanded);
    }

    loadState() {
        // Cargar tema
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        }

        // Cargar carrito
        const savedCart = localStorage.getItem('deliveryCart');
        if (savedCart) {
            try {
                const cartData = JSON.parse(savedCart);
                this.modules.cart.loadFromStorage(cartData);
            } catch (error) {
                console.error('Error cargando carrito:', error);
            }
        }

        // Cargar datos del cliente
        const savedCustomer = localStorage.getItem('deliveryCustomer');
        if (savedCustomer) {
            try {
                const customerData = JSON.parse(savedCustomer);
                this.modules.checkout.loadCustomerData(customerData);
            } catch (error) {
                console.error('Error cargando datos del cliente:', error);
            }
        }
    }

    saveState() {
        // Guardar carrito
        localStorage.setItem('deliveryCart', JSON.stringify(this.modules.cart.getItems()));
        
        // Guardar datos del cliente
        const customerData = this.modules.checkout.getCustomerData();
        if (customerData) {
            localStorage.setItem('deliveryCustomer', JSON.stringify(customerData));
        }
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('sw.js');
                console.log('Service Worker registrado');
            } catch (error) {
                console.warn('Error registrando Service Worker:', error);
            }
        }
    }

    // Métodos públicos para comunicación entre módulos
    getCart() {
        return this.modules.cart;
    }

    getCheckout() {
        return this.modules.checkout;
    }

    getConfig() {
        return this.config;
    }

    getProducts() {
        return this.products;
    }

    updateProduct(productId, updates) {
        const index = this.products.findIndex(p => p.id === productId);
        if (index !== -1) {
            this.products[index] = { ...this.products[index], ...updates };
            this.modules.catalog.updateProductDisplay(productId, updates);
        }
    }

    updateZone(zoneId, updates) {
        const index = this.config.sucursales.findIndex(z => z.id === zoneId);
        if (index !== -1) {
            this.config.sucursales[index] = { ...this.config.sucursales[index], ...updates };
            this.saveConfigToStorage();
        }
    }

    saveConfigToStorage() {
        localStorage.setItem('deliveryConfig', JSON.stringify(this.config));
    }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.deliveryApp = new DeliveryApp();
});

// Exportar para usar en módulos individuales
export { DeliveryApp };
