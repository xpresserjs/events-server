import JobHelper from "xpresser/src/Console/JobHelper";

export = async (args: any[], { helper }: { helper: JobHelper }) => {
    console.log(helper.$);
};
