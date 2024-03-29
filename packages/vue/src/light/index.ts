import MoraLight from './index.vue';

MoraLight.name = 'MoraLight';

MoraLight.install = (app: any) => {
    app.component(MoraLight.name, MoraLight);
};

export default MoraLight;
