import WrappedMoraLight from './index.vue';

WrappedMoraLight.name = 'WrappedMoraLight';

WrappedMoraLight.install = (app: any) => {
    app.component(WrappedMoraLight.name, WrappedMoraLight);
};

export default WrappedMoraLight;
