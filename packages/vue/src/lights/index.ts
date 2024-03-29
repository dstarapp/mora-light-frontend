import MoraLights from './index.vue';

MoraLights.name = 'MoraLights';

MoraLights.install = (app: any) => {
    app.component(MoraLights.name, MoraLights);
};

export default MoraLights;
